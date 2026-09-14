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
      <main className="content-page narrow">
        <div className="form-panel" style={{ textAlign: 'center', marginTop: '20px' }}>
          <p className="error" role="alert" style={{ marginBottom: '15px' }}>{t.dispatchNotice}</p>
          <Link href="/" className="button primary">{t.back}</Link>
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
    <main className="content-page narrow">
      <Link href="/" className="back-link">
        <ArrowUpLeft size={18} className={lang === 'en' ? 'rotate-180' : ''} /> {t.back}
      </Link>
      
      <div className="form-panel" style={{ marginTop: '20px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
          <AlertTriangle size={24} color="var(--destructive)" />
          {t.requestHelp}
        </h1>
        <p className="intro" style={{ marginTop: '5px' }}>{t.waitingFitterSub}</p>
        
        {error && <p className="error" role="alert">{error}</p>}

        <form onSubmit={submit} className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <label className="field full">
            <span style={{ fontWeight: 600 }}>{t.phone}</span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
              dir="ltr"
            />
          </label>
          <label className="field full">
            <span style={{ fontWeight: 600 }}>{t.optional}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              rows={3}
            />
          </label>
          
          <button type="submit" className="button primary full" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? <span className="spin">⟳</span> : <AlertTriangle size={17} />}
            {loading ? t.requesting : t.requestHelp}
          </button>
        </form>
      </div>
    </main>
  );
}
