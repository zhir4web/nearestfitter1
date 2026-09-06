'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpLeft, AlertTriangle, Phone, FileText } from 'lucide-react';
import { useLanguage } from '@/components/language';
import Link from 'next/link';

export default function RequestHelpPage() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!lat || !lng) {
    return (
      <main className="form-page">
        <div className="form-container">
          <p className="error" role="alert">{t.dispatchNotice}</p>
          <Link href="/" className="button">{t.back}</Link>
        </div>
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length < 5) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_lat: parseFloat(lat!), 
          user_lng: parseFloat(lng!),
          user_phone: phone,
          user_note: note
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 404) {
          setError(t.noFittersOpen);
        } else {
          throw new Error(data.error || 'Request failed');
        }
      } else {
        router.push(`/request-status/${data.user_token}`);
      }
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="form-page">
      <Link href="/" className="back-link">
        <ArrowUpLeft size={18} className={lang === 'en' ? 'rotate-180' : ''} /> {t.back}
      </Link>
      <div className="form-container">
        <h1>
          <AlertTriangle size={24} className="error-icon" style={{color: 'var(--red)'}} />
          {t.requestHelp}
        </h1>
        <p className="form-intro" style={{marginTop: '0.5rem'}}>{t.waitingFitterSub}</p>
        
        {error && <p className="error" role="alert">{error}</p>}

        <form onSubmit={submit}>
          <label>
            <span>{t.phone}</span>
            <div className="input-group">
              <Phone size={18} />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                dir="ltr"
              />
            </div>
          </label>
          <label>
            <span>{t.optional}</span>
            <div className="input-group">
              <FileText size={18} />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.notePlaceholder}
                rows={3}
              />
            </div>
          </label>
          
          <button type="submit" className="button primary submit-btn" disabled={loading}>
            {loading ? <span className="spin">⟳</span> : <AlertTriangle size={17} />}
            {loading ? t.requesting : t.requestHelp}
          </button>
        </form>
      </div>
    </main>
  );
}
