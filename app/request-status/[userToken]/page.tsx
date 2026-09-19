'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Home,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '@/components/language';
import Link from 'next/link';

const DispatchMap = dynamic(() => import('@/components/dispatch-map'), {
  ssr: false,
});

function haversineKm(latA: number, lngA: number, latB: number, lngB: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(latB - latA);
  const dLng = radians(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(latA)) * Math.cos(radians(latB)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RequestStatusPage({
  params,
}: {
  params: Promise<{ userToken: string }>;
}) {
  const { userToken } = use(params);
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [status, setStatus] = useState<string>('pending');
  const [fitterName, setFitterName] = useState<string>('');
  const [error, setError] = useState('');

  // Live tracking state
  const [fitterLat, setFitterLat] = useState<number | null>(null);
  const [fitterLng, setFitterLng] = useState<number | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reassigningRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopLocationPolling = useCallback(() => {
    if (trackRef.current) {
      clearInterval(trackRef.current);
      trackRef.current = null;
    }
  }, []);

  const handleReassign = useCallback(async () => {
    if (reassigningRef.current) return;
    reassigningRef.current = true;
    setStatus('reassigning');
    try {
      const res = await fetch('/api/dispatch/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_token: userToken }),
      });
      const data = await res.json();
      if (!res.ok) setStatus('no_fitters');
      else router.push(`/request-status/${data.user_token}`);
    } catch {
      setStatus('error');
    } finally {
      reassigningRef.current = false;
    }
  }, [router, userToken]);

  const startLocationPolling = useCallback(() => {
    if (trackRef.current) return;
    const refreshLocation = async () => {
      try {
        const r = await fetch(`/api/dispatch/${userToken}/fitter-location`);
        if (!r.ok) return;
        const d = await r.json();
        if (d.fitter_lat !== null && d.fitter_lng !== null) {
          setFitterLat(d.fitter_lat);
          setFitterLng(d.fitter_lng);
        }
        if (d.status === 'completed') {
          stopLocationPolling();
          setStatus('completed');
        }
      } catch {
        // A later poll will retry a transient network error.
      }
    };
    void refreshLocation();
    trackRef.current = setInterval(() => void refreshLocation(), 5000);
  }, [stopLocationPolling, userToken]);

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
        if (typeof d.user_lat === 'number' && typeof d.user_lng === 'number') {
          setUserLat(d.user_lat);
          setUserLng(d.user_lng);
        }

        if (
          d.status === 'declined' ||
          d.status === 'reassigning' ||
          d.status === 'completed' ||
          d.status === 'cancelled'
        ) {
          stopPolling();
          stopLocationPolling();
        } else if (
          d.status === 'expired' ||
          (d.expires_at && new Date() > new Date(d.expires_at))
        ) {
          stopPolling();
          void handleReassign();
        } else if (d.status === 'accepted' || d.status === 'en_route') {
          startLocationPolling();
        }
      } catch {
        // keep polling on network error
      }
    }

    void poll();
    pollRef.current = setInterval(poll, 5000);
    return () => {
      stopPolling();
      stopLocationPolling();
    };
  }, [
    handleReassign,
    startLocationPolling,
    stopLocationPolling,
    stopPolling,
    userToken,
  ]);

  if (error) {
    return (
      <main className="form-page">
        <div className="form-container">
          <p className="error" role="alert">
            {error}
          </p>
          <Link href="/find" className="button">
            <Home size={17} /> {t.back}
          </Link>
        </div>
      </main>
    );
  }

  const showMap =
    (status === 'accepted' || status === 'en_route') &&
    userLat !== null &&
    userLng !== null;
  const etaMinutes =
    fitterLat !== null &&
    fitterLng !== null &&
    userLat !== null &&
    userLng !== null
      ? Math.max(
          1,
          Math.ceil(haversineKm(fitterLat, fitterLng, userLat, userLng) / 0.55),
        )
      : null;
  const statusCopy = lang === 'en'
    ? {
        label: 'Request status', sent: 'Request sent', waiting: 'Waiting for the fitter',
        private: 'Your phone number stays private', back: 'Back to fitters',
        enRoute: 'The fitter is on the way', enRouteSub: 'The live location and estimated arrival time update on the map.',
        live: 'Fitter on the way — live location', locationWait: 'Waiting for the fitter location…',
        eta: (minutes: number) => `Estimated arrival: about ${minutes} minutes`, etaWait: 'Waiting for the fitter location…',
        completed: 'Service completed! ✅', completedSub: 'The fitter marked this job complete. Thank you for using NearestFitter.',
      }
    : lang === 'ar'
      ? {
          label: 'حالة الطلب', sent: 'تم إرسال الطلب', waiting: 'بانتظار رد الفني',
          private: 'رقم هاتفك يبقى خاصاً', back: 'العودة إلى الفنيين',
          enRoute: 'الفني في الطريق', enRouteSub: 'يتم تحديث الموقع المباشر ووقت الوصول المتوقع على الخريطة.',
          live: 'الفني في الطريق — الموقع المباشر', locationWait: 'بانتظار موقع الفني…',
          eta: (minutes: number) => `الوصول المتوقع: حوالي ${minutes} دقائق`, etaWait: 'بانتظار موقع الفني…',
          completed: 'اكتملت الخدمة! ✅', completedSub: 'أنهى الفني العمل. شكراً لاستخدامك أقرب فني.',
        }
      : {
          label: 'دۆخی داواکاری', sent: 'داواکاری نێردرا', waiting: 'چاوەڕوانی وەڵامی فیتەر',
          private: 'ژمارەکەت پارێزراوە', back: 'گەڕانەوە بۆ فیتەرەکان',
          enRoute: 'فیتەرەکە لە ڕێگادایە', enRouteSub: 'شوێنی فیتەرەکە و کاتی گەیشتنی خەمڵێنراو لەسەر نەخشە نوێ دەبێتەوە.',
          live: 'فیتەرەکە لە ڕێگایەوە — شوێنی ڕاستەوخۆ', locationWait: 'چاوەڕوانی شوێنی فیتەر…',
          eta: (minutes: number) => `کاتی خەمڵێنراوی گەیشتن: نزیکەی ${minutes} خولەک`, etaWait: 'چاوەڕوانی شوێنی فیتەرەکە…',
          completed: 'خزمەتگوزاری تەواو بوو! ✅', completedSub: 'فیتەرەکە کارەکەی تەواو کرد. سوپاس بۆ بەکارهێنانت.',
        };

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
            <div className="status-waiting-steps" aria-label={statusCopy.label}>
              <span className="active"><CheckCircle2 size={15} />{statusCopy.sent}</span>
              <span><Loader2 size={15} className="spin" />{statusCopy.waiting}</span>
              <span><ShieldCheck size={15} />{statusCopy.private}</span>
            </div>
            <Link href="/find" className="status-back-link"><Home size={16} />{statusCopy.back}</Link>
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
        {(status === 'accepted' || status === 'en_route') && (
          <div className="status-accepted">
            <div className="accepted-header">
              <div className="dispatch-icon accepted">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h2 className="dispatch-success">
                  {status === 'en_route'
                    ? statusCopy.enRoute
                    : t.fitterAccepted}
                </h2>
                <p>
                  {status === 'en_route'
                    ? statusCopy.enRouteSub
                    : t.fitterAcceptedSub}
                </p>
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
                      <span>{statusCopy.live}</span>
                    </>
                  ) : (
                    <>
                      <Loader2 size={14} className="spin" />
                      <span>{statusCopy.locationWait}</span>
                    </>
                  )}
                </div>
                <p className="tracking-eta">
                  {etaMinutes
                    ? statusCopy.eta(etaMinutes)
                    : statusCopy.etaWait}
                </p>
                <DispatchMap
                  userLat={userLat}
                  userLng={userLng}
                  fitterLat={fitterLat ?? undefined}
                  fitterLng={fitterLng ?? undefined}
                  mode="customer"
                />
              </div>
            )}

            <Link href="/find" className="button" style={{ marginTop: '1.5rem' }}>
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
            <h2>{statusCopy.completed}</h2>
            <p>{statusCopy.completedSub}</p>
            <Link
              href="/find"
              className="button primary"
              style={{ marginTop: '1.5rem' }}
            >
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
            <Link
              href="/find"
              className="button primary"
              style={{ marginTop: '1.5rem' }}
            >
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
            <Link
              href="/find"
              className="button primary"
              style={{ marginTop: '1.5rem' }}
            >
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
            <Link
              href="/find"
              className="button primary"
              style={{ marginTop: '1.5rem' }}
            >
              <Home size={17} /> {t.back}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
