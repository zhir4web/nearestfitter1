'use client';
import { useEffect, useState, useRef, use } from 'react';
import { useLanguage } from '@/components/language';
import { Truck, Check, X, MapPin, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type RequestData = {
  id: string;
  user_lat: number;
  user_lng: number;
  user_note: string;
  fitter_token: string;
  expires_at: string;
  created_at: string;
};

export default function FitterDashboard({ params }: { params: Promise<{ fitterCode: string }> }) {
  const { fitterCode } = use(params);
  const { t } = useLanguage();
  
  const [fitterName, setFitterName] = useState('');
  const [req, setReq] = useState<RequestData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const r = await fetch(`/api/fitter/dashboard/${fitterCode}`);
        const d = await r.json();
        
        if (!r.ok) {
          setError(d.error || 'Unauthorized');
          setLoading(false);
          stopPolling();
          return;
        }

        setFitterName(d.fitter.fitter_name);
        setReq(d.request);
        setLoading(false);
        
        if (d.request) {
          updateTimer(d.request.expires_at);
        } else {
          setTimeLeft(0);
        }
      } catch {
        // keep polling
      }
    }
    
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => stopPolling();
  }, [fitterCode]);

  useEffect(() => {
    if (!req) return;
    const tId = setInterval(() => {
      updateTimer(req.expires_at);
    }, 1000);
    return () => clearInterval(tId);
  }, [req]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function updateTimer(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
  }

  async function handleAccept() {
    if (!req) return;
    try {
      await fetch(`/api/dispatch/accept/${req.fitter_token}`, { method: 'POST' });
      // Open google maps
      window.open(`https://maps.google.com/?q=${req.user_lat},${req.user_lng}`, '_blank');
      setReq(null);
    } catch {
      // ignore
    }
  }

  async function handleDecline() {
    if (!req) return;
    try {
      await fetch(`/api/dispatch/decline/${req.fitter_token}`, { method: 'POST' });
      setReq(null);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <main className="form-page">
        <div className="form-container" style={{textAlign: 'center', padding: '3rem'}}>
          <span className="spin" style={{display: 'inline-block', fontSize: '2rem'}}>⟳</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="form-page">
        <div className="form-container">
          <p className="error" role="alert">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="form-page">
      <div className="form-container">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
          <h1 style={{fontSize: '1.25rem', margin: 0}}>{fitterName}</h1>
          <span className="live-dot" />
        </div>

        {!req || timeLeft === 0 ? (
          <div style={{textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface-raised)', borderRadius: '12px'}}>
            <Truck size={32} style={{opacity: 0.3, marginBottom: '1rem'}} />
            <h2 style={{fontSize: '1.2rem', margin: '0 0 0.5rem 0'}}>چاوەڕوانی داواکاری...</h2>
            <p style={{margin: 0, opacity: 0.7}}>کاتێک شۆفێرێک پێویستی بە یارمەتی بوو، لێرە دەردەکەوێت.</p>
          </div>
        ) : (
          <div style={{background: 'var(--surface-raised)', border: '2px solid var(--red)', borderRadius: '12px', padding: '1.5rem', animation: 'pulse-border 2s infinite'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
              <h2 style={{color: 'var(--red)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <AlertCircle size={20} />
                داواکاری نوێ!
              </h2>
              <span style={{fontWeight: 'bold', fontSize: '1.5rem', color: timeLeft <= 30 ? 'var(--red)' : 'inherit'}}>
                0{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <p style={{margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <MapPin size={16} /> لۆکەیشنی بەکارهێنەر
              </p>
              {req.user_note && (
                <div style={{background: 'var(--bg)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem'}}>
                  <strong>تێبینی:</strong> {req.user_note}
                </div>
              )}
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <button className="button primary" onClick={handleAccept} style={{background: 'var(--green)', color: '#fff', border: 'none'}}>
                <Check size={18} /> قبووڵکردن
              </button>
              <button className="button" onClick={handleDecline} style={{border: '1px solid var(--border)'}}>
                <X size={18} /> ڕەتکردنەوە
              </button>
            </div>
            <p style={{fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem', opacity: 0.7}}>
              دوای قبووڵکردن، گووگڵ مەپ دەکرێتەوە بۆ چوونە لای بەکارهێنەر.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
