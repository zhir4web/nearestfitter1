'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Store,
  Phone,
  Mail,
} from 'lucide-react';
import { useLanguage } from './language';
import { Footer } from './header';
import { FitterForm } from './fitter-form';
export function PublicPage({ kind }: { kind: 'add' | 'about' | 'contact' }) {
  const { t, lang } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
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
    <main className={'content-page ' + (kind === 'add' ? '' : 'narrow')}>
      <Link className="back-link" href="/">
        {lang === 'en' ? <ArrowLeft size={17} /> : <ArrowRight size={17} />}{' '}
        {t.back}
      </Link>
      <div className="page-icon">
        {kind === 'add' ? (
          <Store size={32} />
        ) : kind === 'about' ? (
          <MapPin size={32} />
        ) : (
          <MessageCircle size={32} />
        )}
      </div>
      <h1>
        {kind === 'add'
          ? t.addTitle
          : kind === 'about'
            ? t.aboutTitle
            : t.contactTitle}
      </h1>
      <p className="intro">
        {kind === 'add'
          ? t.addIntro
          : kind === 'about'
            ? t.aboutText
            : t.contactIntro}
      </p>
      {kind === 'add' ? (
        <FitterForm />
      ) : kind === 'about' ? (
        <>
          <p className="policy-note">{t.aboutNote}</p>
          <Link className="button primary mt-6" href="/">
            {t.map}
          </Link>
        </>
      ) : (
        <>
          {process.env.NEXT_PUBLIC_CONTACT_PHONE && (
            <a
              className="button mb-4"
              href={'tel:' + process.env.NEXT_PUBLIC_CONTACT_PHONE}
            >
              <Phone size={16} />
              <bdi>{process.env.NEXT_PUBLIC_CONTACT_PHONE}</bdi>
            </a>
          )}
          {process.env.NEXT_PUBLIC_CONTACT_EMAIL && (
            <a
              className="button mb-4"
              href={'mailto:' + process.env.NEXT_PUBLIC_CONTACT_EMAIL}
            >
              <Mail size={16} />
              {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
            </a>
          )}
          {success ? (
            <p className="success" role="status">
              {t.contactSuccess}
            </p>
          ) : (
            <form className="form-panel review-form" onSubmit={send}>
              <label className="field">
                {t.name} *
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
              <label className="field">
                {t.email} *
                <input
                  name="email"
                  type="email"
                  dir="ltr"
                  required
                  maxLength={180}
                  autoComplete="email"
                />
              </label>
              <label className="field">
                {t.message} *
                <textarea
                  name="message"
                  required
                  minLength={5}
                  maxLength={3000}
                />
              </label>
              <label className="honeypot" aria-hidden>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button className="button primary" disabled={busy}>
                {busy ? t.sending : t.submit}
              </button>
            </form>
          )}
        </>
      )}
      <Footer />
    </main>
  );
}
