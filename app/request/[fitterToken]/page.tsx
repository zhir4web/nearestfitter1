'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, MapPin, Clock, Truck } from 'lucide-react';

type State =
  | { phase: 'loading' }
  | { phase: 'ready'; user_lat: number; user_lng: number; dist: string; created_at: string }
  | { phase: 'accepted' }
  | { phase: 'declined' }
  | { phase: 'already' }
  | { phase: 'error'; msg: string };

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = Math.PI / 180;
  const d =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return (6371 * 2 * Math.atan2(Math.sqrt(d), Math.sqrt(1 - d))).toFixed(1);
}

export default function RequestPage({
  params,
}: {
  params: Promise<{ fitterToken: string }>;
}) {
  const [token, setToken] = useState('');
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    params.then((p) => setToken(p.fitterToken));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/dispatch/status/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setState({ phase: 'error', msg: 'داواکاری نەدۆزرایەوە.' });
          return;
        }
        if (data.status !== 'pending') {
          setState({ phase: 'already' });
          return;
        }
        // Try to get approximate distance from fitter's own location
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            const dist = haversine(
              pos.coords.latitude,
              pos.coords.longitude,
              data.user_lat,
              data.user_lng,
            );
            setState({
              phase: 'ready',
              user_lat: data.user_lat,
              user_lng: data.user_lng,
              dist,
              created_at: data.created_at,
            });
          },
          () => {
            setState({
              phase: 'ready',
              user_lat: data.user_lat,
              user_lng: data.user_lng,
              dist: '—',
              created_at: data.created_at,
            });
          },
          { enableHighAccuracy: true, timeout: 6000 },
        );
      })
      .catch(() => setState({ phase: 'error', msg: 'هەڵە ڕوویدا.' }));
  }, [token]);

  async function respond(action: 'accept' | 'decline') {
    const res = await fetch(`/api/dispatch/${action}/${token}`, {
      method: 'POST',
    });
    if (res.ok) {
      if (action === 'accept') {
        setState({ phase: 'accepted' });
        // Open Google Maps navigation to user
        if (state.phase === 'ready') {
          setTimeout(() => {
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${state.user_lat},${state.user_lng}&travelmode=driving`,
              '_blank',
            );
          }, 800);
        }
      } else {
        setState({ phase: 'declined' });
      }
    } else {
      const d = await res.json();
      setState({ phase: 'error', msg: d.error || 'هەڵە ڕوویدا.' });
    }
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '1.5rem',
        fontFamily: 'var(--font-ckb, sans-serif)',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1.5rem',
          padding: '2rem',
          maxWidth: '26rem',
          width: '100%',
          color: '#f1f5f9',
          textAlign: 'center',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        }}
      >
        {state.phase === 'loading' && (
          <>
            <div className="dispatch-spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#94a3b8' }}>چاوەڕوانبە…</p>
          </>
        )}

        {state.phase === 'ready' && (
          <>
            <div
              style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                background: 'rgba(251,146,60,0.15)',
                border: '2px solid #fb923c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <Truck size={28} color="#fb923c" />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              🚨 داواکاریی فیتەری نوێ!
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              کەسێک بانگی تۆ کردووە
            </p>

            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '1rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <MapPin size={16} color="#34d399" />
                <span style={{ fontSize: '0.9rem' }}>
                  شوێن:{' '}
                  <a
                    href={`https://maps.google.com/?q=${state.user_lat},${state.user_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#34d399', textDecoration: 'underline' }}
                  >
                    بە نەخشە ببینە
                  </a>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Truck size={16} color="#60a5fa" />
                <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                  دووری پێشبینیکراو:{' '}
                  <strong style={{ color: '#f1f5f9' }}>{state.dist} کم</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Clock size={16} color="#a78bfa" />
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {new Date(state.created_at).toLocaleTimeString('ar-IQ')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => respond('accept')}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  borderRadius: '0.85rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(22,163,74,0.3)',
                }}
              >
                <CheckCircle size={20} />
                قبووڵ بکە
              </button>
              <button
                onClick={() => respond('decline')}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  borderRadius: '0.85rem',
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#fca5a5',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <XCircle size={20} />
                ڕەتبکەرەوە
              </button>
            </div>
          </>
        )}

        {state.phase === 'accepted' && (
          <>
            <div
              style={{
                width: '4.5rem',
                height: '4.5rem',
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.15)',
                border: '2px solid #22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <CheckCircle size={32} color="#22c55e" />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.5rem' }}>
              ✅ قبووڵت کرد!
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.25rem' }}>
              گووگڵ مەپ دەکرێتەوە بۆ شوێنی کەسەکە…
            </p>
            {state.phase === 'accepted' && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${
                  (state as { phase: 'accepted' } & { user_lat?: number; user_lng?: number }).user_lat ?? ''
                },${(state as { phase: 'accepted' } & { user_lat?: number; user_lng?: number }).user_lng ?? ''}&travelmode=driving`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.85rem',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <MapPin size={18} />
                نەخشەکە بکەرەوە
              </a>
            )}
          </>
        )}

        {state.phase === 'declined' && (
          <>
            <XCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fca5a5' }}>
              ڕەتت کردەوە
            </h2>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
              داواکاریەکە بەتاڵ کرا.
            </p>
          </>
        )}

        {state.phase === 'already' && (
          <>
            <Clock size={48} color="#f59e0b" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fcd34d' }}>
              داواکاریەکە تەواوبووە
            </h2>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
              ئەم داواکاریە پێشتر مامەڵەی لەگەڵ کراوە.
            </p>
          </>
        )}

        {state.phase === 'error' && (
          <>
            <XCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <h2 style={{ fontSize: '1.2rem', color: '#fca5a5', fontWeight: 700 }}>هەڵە</h2>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>{state.msg}</p>
          </>
        )}

        <p
          style={{
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: '#475569',
          }}
        >
          نزیکترین فیتەر • سلێمانی
        </p>
      </div>
    </main>
  );
}
