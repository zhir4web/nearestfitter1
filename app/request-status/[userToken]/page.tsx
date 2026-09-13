'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Home,
  MapPin,
  Navigation,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '@/components/language';
import Link from 'next/link';

const DispatchMap = dynamic(() => import('@/components/dispatch-map'), {
  ssr: false,
});

export default function RequestStatusPage({
  params,
}: {
  params: Promise<{ userToken: string }>;
}) {
  const { userToken } = use(params);
  const { t } = useLanguage();
  const router = useRouter();

  const [status, setStatus] = useState<string>('pending');
  const [fitterName, setFitterName] = useState<string>('');
  const [error, setError] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // Live tracking state
  const [fitterLat, setFitterLat] = useState<number | null>(null);
  const [fitterLng, setFitterLng] = useState<number | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Dispatch status polling ──
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

        if (
          d.status === 'accepted' ||
          d.status === 'declined' ||
          d.status === 'reassigning'
        ) {
          stopPolling();
          if (d.status === 'accepted') startLocationPolling();
        } else if (
          d.status === 'expired' ||
          (d.expires_at && new Date() > new Date(d.expires_at))
        ) {
          stopPolling();
          handleReassign();
        }
      } catch {
        // keep polling on network error
      }
    }

    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => {
      stopPolling();
      stopLocationPolling();
    };
  }, [userToken]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // ── Live fitter location polling (after accept) ──
  function startLocationPolling() {
    if (trackRef.current) return; // already running
    trackRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/dispatch/${userToken}/fitter-location`);
        if (!r.ok) return;
        const d = await r.json();
        if (d.fitter_lat !== null && d.fitter_lng !== null) {
          setFitterLat(d.fitter_lat);
          setFitterLng(d.fitter_lng);
        }
        // If dispatch completed, stop tracking
        if (d.status === 'completed') {
          stopLocationPolling();
          setStatus('completed');
        }
      } catch {
        // ignore
      }
    }, 8000);
  }

  function stopLocationPolling() {
    if (trackRef.current) {
      clearInterval(trackRef.current);
      trackRef.current = null;
    }
  }

  // Get user's own location for map
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        setUserLat(p.coords.latitude);
        setUserLng(p.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

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
          <p className="error" role="alert">
            {error}
          </p>
          <Link href="/" className="button">
            <Home size={17} /> {t.back}
          </Link>
        </div>
      </main>
    );
  }

  const showMap =
    status === 'accepted' &&
    userLat !== null &&
    userLng !== null;

  return (
    <main className="status-page">
      <div className="status-container">
        {/* ── Pending ── */}
        {status === 'pending' && (
          <div className="status-card">
            <div className="dispatch-icon waiting">
              <span className="dispatch-pulse" />
              <Truck size={36} />
            </div>
            <h2>{t.waitingFitter}</h2>
            <p>{t.waitingFitterSub}</p>
            {fitterName && (
              <div className="fitter-name-badge">
                <Truck size={16} />
                {fitterName}
              </div>
            )}
          </div>
        )}

        {/* ── Reassigning ── */}
        {status === 'reassigning' && (
          <div className="status-card">
            <div className="dispatch-icon waiting">
              <span className="dispatch-pulse" />
              <AlertTriangle size={36} />
            </div>
            <h2>{t.findingOtherFitter}</h2>
            <p>{t.findingOtherFitterSub}</p>
          </div>
        )}

        {/* ── Accepted + Live Map ── */}
        {status === 'accepted' && (
          <div className="status-accepted">
            <div className="accepted-header">
              <div className="dispatch-icon accepted">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h2 className="dispatch-success">{t.fitterAccepted}</h2>
                <p>{t.fitterAcceptedSub}</p>
                {fitterName && (
                  <div className="fitter-name-badge">
                    <Truck size={16} />
                    {fitterName}
                  </div>
                )}
              </div>
            </div>

            {showMap && (
              <div className="tracking-map-section">
                <div className="tracking-map-label">
                  {fitterLat ? (
                    <>
                      <span className="live-dot" />
                      <span>فیتەرەکە لە ڕێگایەوە — شوێنی ڕاستەوخۆ</span>
                    </>
                  ) : (
                    <>
                      <Loader2 size={14} className="spin" />
                      <span>چاوەڕوانی لۆکەیشنی فیتەر...</span>
                    </>
                  )}
                </div>
                <DispatchMap
                  userLat={userLat}
                  userLng={userLng}
                  fitterLat={fitterLat ?? undefined}
                  fitterLng={fitterLng ?? undefined}
                  mode="customer"
                />
              </div>
            )}

            <Link href="/" className="button" style={{ marginTop: '1.5rem' }}>
              <Home size={17} /> {t.back}
            </Link>
          </div>
        )}

        {/* ── Completed ── */}
        {status === 'completed' && (
          <div className="status-card">
            <div className="dispatch-icon accepted">
              <CheckCircle2 size={40} />
            </div>
            <h2>خزمەتگوزاری تەواو بوو! ✅</h2>
            <p>فیتەرەکە کارەکەی تەواو کرد. سوپاس بۆ بەکارهێنانت.</p>
            <Link href="/" className="button primary" style={{ marginTop: '1.5rem' }}>
              <Home size={17} /> {t.back}
            </Link>
          </div>
        )}

        {/* ── Declined ── */}
        {status === 'declined' && (
          <div className="status-card">
            <div className="dispatch-icon declined">
              <XCircle size={40} />
            </div>
            <h2>{t.fitterDeclined}</h2>
            <p>{t.fitterDeclinedSub}</p>
            <Link href="/" className="button primary" style={{ marginTop: '1.5rem' }}>
              <Home size={17} /> {t.back}
            </Link>
          </div>
        )}

        {/* ── No fitters ── */}
        {status === 'no_fitters' && (
          <div className="status-card">
            <div className="dispatch-icon declined">
              <AlertTriangle size={40} />
            </div>
            <h2>{t.noFittersOpen}</h2>
            <p>{t.requestExpiredSub}</p>
            <Link href="/" className="button primary" style={{ marginTop: '1.5rem' }}>
              <Home size={17} /> {t.back}
            </Link>
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <div className="status-card">
            <div className="dispatch-icon declined">
              <AlertTriangle size={40} />
            </div>
            <h2>{t.error}</h2>
            <Link href="/" className="button primary" style={{ marginTop: '1.5rem' }}>
              <Home size={17} /> {t.back}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
