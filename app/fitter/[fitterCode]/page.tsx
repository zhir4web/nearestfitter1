'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, useRef, use, useCallback } from 'react';
import { useLanguage } from '@/components/language';
import {
  Truck,
  Check,
  X,
  MapPin,
  AlertCircle,
  Navigation,
  Wifi,
  WifiOff,
  CheckCircle2,
  Clock,
  PhoneCall,
} from 'lucide-react';
import Link from 'next/link';

// Leaflet map loaded dynamically (SSR disabled)
const DispatchMap = dynamic(() => import('@/components/dispatch-map'), { ssr: false });

type RequestData = {
  id: string;
  user_lat: number;
  user_lng: number;
  user_note: string;
  fitter_token: string;
  expires_at: string;
  created_at: string;
  status: string;
};

export default function FitterDashboard({
  params,
}: {
  params: Promise<{ fitterCode: string }>;
}) {
  const { fitterCode } = use(params);
  const { t } = useLanguage();

  const [fitterName, setFitterName] = useState('');
  const [fitterId, setFitterId] = useState('');
  const [req, setReq] = useState<RequestData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [myLoc, setMyLoc] = useState<[number, number] | null>(null);
  const [locError, setLocError] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);

  // ── Polling: fetch dashboard status every 5s ──
  const poll = useCallback(async () => {
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
      setFitterId(d.fitter.fitter_id);
      setLoading(false);

      if (d.request) {
        // Only update req if status changed or no current req
        setReq((prev) => {
          if (!prev || prev.id !== d.request.id || prev.status !== d.request.status) {
            return d.request;
          }
          return prev;
        });
        if (d.request.status === 'accepted') setAccepted(true);
        updateTimer(d.request.expires_at);
      } else {
        if (!completed) setReq(null);
        setTimeLeft(0);
      }
    } catch {
      // keep polling silently
    }
  }, [fitterCode, completed]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => stopPolling();
  }, [poll]);

  // ── Timer countdown ──
  useEffect(() => {
    if (!req) return;
    const tId = setInterval(() => updateTimer(req.expires_at), 1000);
    return () => clearInterval(tId);
  }, [req]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function updateTimer(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
  }

  // ── GPS location tracking ──
  function startLocationTracking() {
    if (!navigator.geolocation) {
      setLocError(true);
      return;
    }
    setLocError(false);
    setIsOnline(true);

    // Watch position continuously
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyLoc([pos.coords.latitude, pos.coords.longitude]);
      },
      () => setLocError(true),
      { enableHighAccuracy: true, maximumAge: 10000 },
    );

    // Send location to server every 10s
    locationRef.current = setInterval(async () => {
      if (!myLoc) return;
      try {
        await fetch('/api/fitter/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fitter_code: fitterCode,
            lat: myLoc[0],
            lng: myLoc[1],
            is_online: true,
          }),
        });
      } catch {
        // ignore network errors
      }
    }, 10000);
  }

  function stopLocationTracking() {
    setIsOnline(false);
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (locationRef.current) {
      clearInterval(locationRef.current);
      locationRef.current = null;
    }
    // Notify server we're offline
    fetch('/api/fitter/location', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fitter_code: fitterCode }),
    }).catch(() => {});
  }

  // Send location immediately when myLoc updates (while online)
  useEffect(() => {
    if (!isOnline || !myLoc) return;
    fetch('/api/fitter/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fitter_code: fitterCode,
        lat: myLoc[0],
        lng: myLoc[1],
        is_online: true,
      }),
    }).catch(() => {});
  }, [myLoc, isOnline, fitterCode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
      stopPolling();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Accept / Decline ──
  async function handleAccept() {
    if (!req) return;
    try {
      const res = await fetch(`/api/dispatch/accept/${req.fitter_token}`, {
        method: 'POST',
      });
      if (res.ok) {
        setAccepted(true);
        setReq((prev) => prev ? { ...prev, status: 'accepted' } : prev);
        // Auto-start location tracking when accepting
        if (!isOnline) startLocationTracking();
      }
    } catch {
      // ignore
    }
  }

  async function handleDecline() {
    if (!req) return;
    try {
      await fetch(`/api/dispatch/decline/${req.fitter_token}`, {
        method: 'POST',
      });
      setReq(null);
      setAccepted(false);
    } catch {
      // ignore
    }
  }

  async function handleComplete() {
    if (!req) return;
    try {
      // Mark as completed via accept endpoint with completed flag, or use dedicated endpoint
      await fetch(`/api/dispatch/accept/${req.fitter_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complete: true }),
      });
      setCompleted(true);
      setReq(null);
      setAccepted(false);
      stopLocationTracking();
    } catch {
      // ignore
    }
  }

  // ── Loading / Error states ──
  if (loading) {
    return (
      <main className="form-page">
        <div className="fitter-dashboard-loading">
          <div className="dashboard-spinner">
            <Truck size={32} className="spin" />
          </div>
          <p>چاوەڕوانبە...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="form-page">
        <div className="form-container">
          <p className="error" role="alert">
            {error}
          </p>
          <Link href="/" className="button">
            گەڕانەوە
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="fitter-dashboard">
      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <Truck size={22} />
          <div>
            <h1>{fitterName}</h1>
            <span className="dashboard-subtitle">داشبۆردی فیتەر</span>
          </div>
        </div>
        <div className="dashboard-status-wrap">
          <button
            id="toggle-online-btn"
            className={`status-toggle ${isOnline ? 'online' : 'offline'}`}
            onClick={() => (isOnline ? stopLocationTracking() : startLocationTracking())}
          >
            {isOnline ? (
              <>
                <Wifi size={15} />
                بەردەستم
              </>
            ) : (
              <>
                <WifiOff size={15} />
                نابەردەست
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Location error ── */}
      {locError && (
        <div className="loc-error-banner" role="alert">
          <MapPin size={15} />
          <span>
            دەستگەیشتن بە شوێن ڕەت کرایەوە — شوێن ناگات بۆ داواکار
          </span>
        </div>
      )}

      {/* ── Completed state ── */}
      {completed && (
        <div className="dashboard-card completed-card">
          <div className="completed-icon">
            <CheckCircle2 size={40} />
          </div>
          <h2>کارەکە تەواو بوو! 🎉</h2>
          <p>سوپاس بۆ خزمەتگوزارییەکەت.</p>
          <button
            className="button primary"
            onClick={() => {
              setCompleted(false);
              startLocationTracking();
            }}
          >
            چاوەڕوانی داواکاری تازە
          </button>
        </div>
      )}

      {/* ── Accepted: show map with customer location ── */}
      {!completed && accepted && req && req.status === 'accepted' && (
        <div className="dashboard-map-section">
          <div className="dashboard-map-header">
            <Navigation size={18} className="text-primary" />
            <span>شوێنی داواکار لەسەر نەخشە</span>
          </div>
          <div className="dashboard-map-wrap">
            <DispatchMap
              userLat={req.user_lat}
              userLng={req.user_lng}
              fitterLat={myLoc?.[0]}
              fitterLng={myLoc?.[1]}
              mode="fitter"
            />
          </div>
          <div className="dashboard-nav-actions">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${req.user_lat},${req.user_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="button primary nav-btn"
            >
              <Navigation size={17} />
              گووگڵ مەپ کردنەوە
            </a>
            <button
              className="button complete-btn"
              onClick={handleComplete}
            >
              <CheckCircle2 size={17} />
              کارەکەم تەواو بوو
            </button>
          </div>
          {req.user_note && (
            <div className="request-note">
              <strong>تێبینی داواکار:</strong> {req.user_note}
            </div>
          )}
        </div>
      )}

      {/* ── Pending request card ── */}
      {!completed && !accepted && (
        <div className="dashboard-content">
          {!req || timeLeft === 0 ? (
            <div className="waiting-card">
              <div className="waiting-icon">
                <Truck size={40} />
              </div>
              <h2>چاوەڕوانی داواکاری...</h2>
              <p>
                {isOnline
                  ? 'بەردەستیت و ئاگادار دەکرێیتەوە کاتێک داواکارێک هەبێت.'
                  : 'کلیک بکە لەسەر "بەردەستم" بۆ وەرگرتنی داواکاری.'}
              </p>
              {!isOnline && (
                <button
                  className="button primary"
                  onClick={startLocationTracking}
                >
                  <Wifi size={17} />
                  بەردەستم — دەستپێبکە
                </button>
              )}
            </div>
          ) : (
            <div className="request-card incoming">
              {/* Timer */}
              <div className="request-card-header">
                <h2 className="incoming-title">
                  <AlertCircle size={22} />
                  داواکاری نوێ!
                </h2>
                <div
                  className={`request-timer ${timeLeft <= 30 ? 'urgent' : ''}`}
                >
                  <Clock size={16} />
                  {`0${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                </div>
              </div>

              {/* User location on mini-map */}
              <div className="request-minimap">
                <DispatchMap
                  userLat={req.user_lat}
                  userLng={req.user_lng}
                  fitterLat={myLoc?.[0]}
                  fitterLng={myLoc?.[1]}
                  mode="fitter"
                  compact
                />
              </div>

              <div className="request-meta">
                <span>
                  <MapPin size={15} />
                  شوێنی داواکار
                </span>
                {myLoc && (
                  <span className="distance-badge">
                    {(
                      (() => {
                        const R = Math.PI / 180;
                        const d =
                          Math.sin(
                            ((req.user_lat - myLoc[0]) * R) / 2,
                          ) **
                            2 +
                          Math.cos(myLoc[0] * R) *
                            Math.cos(req.user_lat * R) *
                            Math.sin(
                              ((req.user_lng - myLoc[1]) * R) / 2,
                            ) **
                              2;
                        return 6371 *
                          2 *
                          Math.atan2(Math.sqrt(d), Math.sqrt(1 - d));
                      })()
                    ).toFixed(1)}{' '}
                    کم
                  </span>
                )}
              </div>

              {req.user_note && (
                <div className="request-note">
                  <strong>تێبینی:</strong> {req.user_note}
                </div>
              )}

              {/* Accept / Decline */}
              <div className="request-actions">
                <button
                  id="accept-request-btn"
                  className="button accept-btn"
                  onClick={handleAccept}
                >
                  <Check size={20} />
                  قبووڵکردن
                </button>
                <button
                  id="decline-request-btn"
                  className="button decline-btn"
                  onClick={handleDecline}
                >
                  <X size={20} />
                  ڕەتکردنەوە
                </button>
              </div>

              <p className="request-hint">
                دوای قبووڵکردن، نەخشەی شوێنی داواکار دەکرێتەوە.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── My location display ── */}
      {isOnline && myLoc && (
        <div className="my-location-bar">
          <MapPin size={14} />
          <span dir="ltr">
            {myLoc[0].toFixed(5)}, {myLoc[1].toFixed(5)}
          </span>
          <span className="live-dot" />
          <span>زیندوو</span>
        </div>
      )}
    </main>
  );
}
