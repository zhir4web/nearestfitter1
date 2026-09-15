'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Navigation,
  AlertTriangle,
  MapPin,
  Store,
  Truck,
  X,
  Star,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from './language';
import { distance, opening } from '@/lib/geo';
import type { Fitter, Review } from '@/types';
export function Detail({
  fitter: f,
  user,
  onClose,
}: {
  fitter: Fitter;
  user?: [number, number];
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [rating, setRating] = useState(5);
  const [now, setNow] = useState(new Date());
  async function load() {
    setLoadError(false);
    setLoading(true);
    try {
      const r = await fetch('/api/reviews/' + f.id);
      if (!r.ok) throw Error();
      setReviews(await r.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [f.id]);
  const status = opening(f.working_hours, now);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/reviews/' + f.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_name: form.get('name'),
          comment: form.get('comment'),
          website: form.get('website'),
          rating,
        }),
      });
      if (!r.ok) throw Error();
      setSuccess(true);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side={lang === 'en' ? 'right' : 'left'}
        showCloseButton={false}
        className="detail-panel"
        dir={lang === 'en' ? 'ltr' : 'rtl'}
      >
        <div className="detail-image">
          {f.photo_url ? (
            <Image
              src={f.photo_url}
              alt={f.name}
              fill
              sizes="510px"
              style={{ objectFit: 'cover' }}
            />
          ) : f.type === 'mobile' ? (
            <Truck />
          ) : (
            <Store />
          )}
          <button
            className="button detail-close"
            onClick={onClose}
            aria-label={t.close}
          >
            <X size={19} />
          </button>
          <span className="detail-type">
            {t[f.type]} {f.demo ? ' · ' + t.demo : ''}
          </span>
        </div>
        <div className="detail-body">
          <SheetTitle className="detail-heading">{f.name}</SheetTitle>
          <SheetDescription className="detail-neighborhood">
            <MapPin size={16} />
            {f.neighborhood}
          </SheetDescription>
          <div className="detail-meta">
            <span className={status.open ? 'open-text' : 'muted'}>
              {status.open ? t.open : t.closed}
              {!status.open && status.time && (
                <>
                  {' '}
                  · {t.opens} {t.days[status.day!]} {status.time}
                </>
              )}
            </span>
            {user && (
              <span>
                {distance(user, [f.latitude, f.longitude]).toFixed(1)} {t.away}
              </span>
            )}
            <span className="rating">
              <Star size={16} />
              {reviews.length
                ? (
                    reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
                  ).toFixed(1)
                : '—'}{' '}
              ({reviews.length})
            </span>
          </div>
          {f.demo && (
            <p className="demo-note">{t.demoNotice}</p>
          )}
          <div className="detail-actions">
              {!f.demo && user && status.open && (
                <Link className="button primary" href={`/request-help?lat=${user[0]}&lng=${user[1]}&fitter=${encodeURIComponent(f.id)}`}>
                  <AlertTriangle size={18} />
                  {t.requestHelp}
                </Link>
              )}
              <a
                className="button directions"
                href={`https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={18} />
                {t.directions}
              </a>
            </div>
          <section className="form-section">
            <h2 className="field-title">{t.services}</h2>
            <div className="service-tags">
              {f.services.map((s, idx) => (
                <span key={idx} className="free-text-service">{s}</span>
              ))}
            </div>
          </section>
          <section className="form-section">
            <h2 className="field-title">{t.hours}</h2>
            {f.working_hours.map((h, i) => (
              <div className="detail-hours" key={i}>
                <span>{t.days[i]}</span>
                <span dir="auto">
                  {h.closed
                    ? t.dayClosed
                    : h.allDay
                      ? t.allDay
                      : h.open + ' — ' + h.close}
                </span>
              </div>
            ))}
          </section>
          <section className="form-section">
            <h2 className="field-title">
              {t.reviews} ({reviews.length})
            </h2>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : loadError ? (
              <button className="button" onClick={load}>
                {t.retry}
              </button>
            ) : reviews.length ? (
              reviews.map((r) => (
                <article className="review" key={r.id}>
                  <div className="review-head">
                    <strong>{r.reviewer_name}</strong>
                    <span className="stars" aria-label={`${r.rating}/5`}>
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  <p>{r.comment}</p>
                  <small>
                    {new Date(r.created_at).toLocaleDateString(
                      lang === 'en' ? 'en-GB' : 'ar-IQ',
                    )}
                  </small>
                </article>
              ))
            ) : (
              <p className="help">{t.noReviews}</p>
            )}
          </section>
          <section className="form-section">
            <h2 className="field-title">{t.writeReview}</h2>
            {success ? (
              <p className="success" role="status">
                {t.reviewSuccess}
              </p>
            ) : (
              <form className="review-form" onSubmit={submit}>
                <p className="help">{t.privacy}</p>
                <label className="field">
                  {t.name}
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={60}
                    autoComplete="name"
                  />
                </label>
                <div>
                  <p className="field">{t.rating}</p>
                  <div
                    className="rating-buttons"
                    role="group"
                    aria-label={t.ratingLabel}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        aria-label={`${n}/5`}
                        aria-pressed={rating === n}
                        className={n <= rating ? 'chosen' : ''}
                        onClick={() => setRating(n)}
                      >
                        <Star
                          size={20}
                          fill={n <= rating ? 'currentColor' : 'none'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <label className="field">
                  {t.comment}
                  <textarea
                    name="comment"
                    required
                    minLength={3}
                    maxLength={1500}
                  />
                </label>
                <label className="honeypot" aria-hidden>
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button className="button primary" disabled={busy}>
                  {busy ? t.sending : t.submit}
                </button>
              </form>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
