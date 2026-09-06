'use client';
import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, CheckCircle2, XCircle, AlertTriangle, Home } from 'lucide-react';
import { useLanguage } from '@/components/language';
import Link from 'next/link';

export default function RequestStatusPage({ params }: { params: Promise<{ userToken: string }> }) {
  const { userToken } = use(params);
  const { t } = useLanguage();
  const router = useRouter();
  
  const [status, setStatus] = useState<string>('pending');
  const [fitterName, setFitterName] = useState<string>('');
  const [error, setError] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const r = await fetch(`/api/dispatch/${userToken}`);
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || 'Not found');
          stopPolling();
          return;
        }

        setStatus(d.status);
        setFitterName(d.fitter_name);

        if (d.status === 'accepted' || d.status === 'declined' || d.status === 'reassigning') {
          stopPolling();
        } else if (d.status === 'expired' || (d.expires_at && new Date() > new Date(d.expires_at))) {
          // Time to reassign!
          stopPolling();
          handleReassign();
        }
      } catch {
        // network error, keep polling
      }
    }
    
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => stopPolling();
  }, [userToken]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleReassign() {
    if (reassigning) return;
    setReassigning(true);
    setStatus('reassigning');
    
    try {
      const res = await fetch('/api/dispatch/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_token: userToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('no_fitters');
        return;
      }
      
      // Redirect to new token
      router.push(`/request-status/${data.user_token}`);
    } catch {
      setStatus('error');
    } finally {
      setReassigning(false);
    }
  }

  if (error) {
    return (
      <main className="form-page">
        <div className="form-container">
          <p className="error" role="alert">{error}</p>
          <Link href="/" className="button"><Home size={17} /> {t.back}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="form-page">
      <div className="form-container" style={{textAlign: 'center', padding: '3rem 1rem'}}>
        
        {status === 'pending' && (
          <>
            <div className="dispatch-icon waiting" style={{margin: '0 auto 1.5rem'}}>
              <span className="dispatch-pulse" />
              <Truck size={32} />
            </div>
            <h2>{t.waitingFitter}</h2>
            <p>{t.waitingFitterSub}</p>
            {fitterName && <h3 style={{marginTop: '1rem', color: 'var(--red)'}}>{fitterName}</h3>}
          </>
        )}

        {status === 'reassigning' && (
          <>
            <div className="dispatch-icon waiting" style={{margin: '0 auto 1.5rem'}}>
              <span className="dispatch-pulse" />
              <AlertTriangle size={32} />
            </div>
            <h2>{t.findingOtherFitter}</h2>
            <p>{t.findingOtherFitterSub}</p>
          </>
        )}

        {status === 'accepted' && (
          <>
            <div className="dispatch-icon accepted" style={{margin: '0 auto 1.5rem'}}>
              <CheckCircle2 size={38} />
            </div>
            <h2 className="dispatch-success">{t.fitterAccepted}</h2>
            <p>{t.fitterAcceptedSub}</p>
            {fitterName && <h3 style={{marginTop: '1rem'}}>{fitterName}</h3>}
            <Link href="/" className="button primary" style={{marginTop: '2rem'}}>
              <Home size={17} /> {t.back}
            </Link>
          </>
        )}

        {status === 'declined' && (
          <>
            <div className="dispatch-icon declined" style={{margin: '0 auto 1.5rem'}}>
              <XCircle size={38} />
            </div>
            <h2>{t.fitterDeclined}</h2>
            <p>{t.fitterDeclinedSub}</p>
            <Link href="/" className="button primary" style={{marginTop: '2rem'}}>
              <Home size={17} /> {t.back}
            </Link>
          </>
        )}

        {status === 'no_fitters' && (
          <>
            <div className="dispatch-icon declined" style={{margin: '0 auto 1.5rem'}}>
              <AlertTriangle size={38} />
            </div>
            <h2>{t.noFittersOpen}</h2>
            <p>{t.requestExpiredSub}</p>
            <Link href="/" className="button primary" style={{marginTop: '2rem'}}>
              <Home size={17} /> {t.back}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="dispatch-icon declined" style={{margin: '0 auto 1.5rem'}}>
              <AlertTriangle size={38} />
            </div>
            <h2>{t.error}</h2>
            <Link href="/" className="button primary" style={{marginTop: '2rem'}}>
              <Home size={17} /> {t.back}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
