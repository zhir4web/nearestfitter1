'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from './language';
import { CENTER, defaultHours } from '@/lib/geo';
import { services, type Fitter, type Service } from '@/types';
const Map = dynamic(() => import('./map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
export function FitterForm({
  initial,
  admin = false,
  onSaved,
  onCancel,
}: {
  initial?: Fitter;
  admin?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { t } = useLanguage();
  const [type, setType] = useState(initial?.type || 'fixed');
  const [serviceText, setServiceText] = useState(
    initial?.services?.[0] || '',
  );
  const initialOpen = initial?.working_hours?.find(h => !h.closed && !h.allDay)?.open || '08:00';
  const initialClose = initial?.working_hours?.find(h => !h.closed && !h.allDay)?.close || '18:00';
  
  const [openTime, setOpenTime] = useState(initialOpen);
  const [closeTime, setCloseTime] = useState(initialClose);
  const [alwaysOpen, setAlwaysOpen] = useState(
    initial?.working_hours?.every(h => h.allDay) || false
  );
  const [coords, setCoords] = useState<[number, number]>(
    initial ? [initial.latitude, initial.longitude] : CENTER,
  );
  const [picked, setPicked] = useState(!!initial);
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState(initial?.photo_url || '');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [status, setStatus] = useState(initial?.status || 'approved');
  const [demo, setDemo] = useState(initial?.demo || false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (
      !picked ||
      (!serviceText.trim()) ||
      (!alwaysOpen && (!openTime || !closeTime))
    ) {
      setError(t.required);
      return;
    }
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const data = {
      id: initial?.id,
      name: form.get('name'),
      phone: form.get('phone'),
      phone2: form.get('phone2'),
      whatsapp: form.get('whatsapp'),
      neighborhood: form.get('neighborhood'),
      type,
      services: [serviceText],
      working_hours: Array.from({length: 7}).map(() => ({
        closed: false,
        allDay: alwaysOpen,
        open: openTime,
        close: closeTime
      })),
      latitude: coords[0],
      longitude: coords[1],
      website: form.get('website'),
      status,
      demo,
      removePhoto,
    };
    const body = new FormData();
    body.set('data', JSON.stringify(data));
    if (photo) body.set('photo', photo);
    try {
      const r = await fetch(admin ? '/api/admin/fitters' : '/api/fitters', {
        method: 'POST',
        body,
      });
      if (!r.ok) throw Error();
      if (admin) onSaved?.();
      else setSuccess(true);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <div className="success" role="status">
        <CheckCircle size={30} />
        <p>{t.addSuccess}</p>
      </div>
    );
  return (
    <form className="form-panel" onSubmit={submit}>
      <div className="form-grid">
        <label className="field full">
          {t.shopName} *
          <input
            name="name"
            defaultValue={initial?.name}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label className="field">
          {t.phone} *
          <input
            name="phone"
            type="tel"
            dir="ltr"
            defaultValue={initial?.phone}
            required
            pattern="[+]?[0-9 ]{7,22}"
            placeholder="+964 7xx xxx xxxx"
          />
        </label>
        <label className="field">
          {t.phone2}
          <input
            name="phone2"
            type="tel"
            dir="ltr"
            defaultValue={initial?.phone2}
            pattern="[+]?[0-9 ]{7,22}"
          />
        </label>
        <label className="field">
          {t.whatsapp} ({t.optional})
          <input
            name="whatsapp"
            type="tel"
            dir="ltr"
            defaultValue={initial?.whatsapp}
            pattern="[+]?[0-9 ]{7,22}"
          />
        </label>
        <label className="field">
          {t.neighborhood} *
          <input
            name="neighborhood"
            defaultValue={initial?.neighborhood}
            required
            minLength={2}
            maxLength={180}
          />
        </label>
        <div className="field full">
          <span>{t.type} *</span>
          <Select
            value={type}
            onValueChange={(v) => setType(v === 'mobile' ? 'mobile' : 'fixed')}
          >
            <SelectTrigger className="field-input" aria-label={t.type}>
              <SelectValue>{t[type]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">{t.fixed}</SelectItem>
              <SelectItem value="mobile">{t.mobile}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <section className="form-section">
        <h2 className="field-title">دەربارەی کارەکان (کورتە) *</h2>
        <textarea
          className="field-input"
          style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
          placeholder="بۆ نموونە: گۆڕینی ڕۆن، فرۆشتنی تایە، پاتری..."
          value={serviceText}
          onChange={(e) => setServiceText(e.target.value)}
          required
        />
      </section>
      
      <section className="form-section">
        <h2 className="field-title">کاتی کارکردن *</h2>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem'}}>
          <label className="choice-pill">
            <Checkbox checked={alwaysOpen} onCheckedChange={(v) => setAlwaysOpen(!!v)} />
            ٢٤ کاتژمێر کراوەیە
          </label>
        </div>
        {!alwaysOpen && (
          <div style={{display: 'flex', gap: '1rem'}}>
            <label className="field full">
              کاتژمێری کرانەوە
              <input type="time" required value={openTime} onChange={e => setOpenTime(e.target.value)} />
            </label>
            <label className="field full">
              کاتژمێری داخستن
              <input type="time" required value={closeTime} onChange={e => setCloseTime(e.target.value)} />
            </label>
          </div>
        )}
      </section>
      <section className="form-section">
        <h2 className="field-title">{t.location} *</h2>
        <p className="help">{t.pickLocation}</p>
        <div className="mini-map">
          <Map
            pick={coords}
            onPick={(p) => {
              setCoords(p);
              setPicked(true);
            }}
          />
        </div>
        <div className="form-grid">
          {[t.latitude, t.longitude].map((label, i) => (
            <label className="field" key={i}>
              {label}
              <input
                type="number"
                dir="ltr"
                step="any"
                required
                min={i === 0 ? 35.2 : 45}
                max={i === 0 ? 35.9 : 45.9}
                value={coords[i]}
                onChange={(e) => {
                  setCoords(
                    i === 0
                      ? [Number(e.target.value), coords[1]]
                      : [coords[0], Number(e.target.value)],
                  );
                  setPicked(true);
                }}
              />
            </label>
          ))}
        </div>
      </section>
      <section className="form-section">
        <h2 className="field-title">{t.hours} *</h2>
        {hours.map((h, i) => {
          const change = (field: string, value: string | boolean) =>
            setHours(
              hours.map((x, j) => (j === i ? { ...x, [field]: value } : x)),
            );
          return (
            <div className="hours-row" key={i}>
              <strong>{t.days[i]}</strong>
              <label className="check-label">
                <Checkbox
                  checked={h.closed}
                  onCheckedChange={(v) => change('closed', v === true)}
                />
                {t.dayClosed}
              </label>
              <label className="check-label">
                <Checkbox
                  checked={h.allDay}
                  disabled={h.closed}
                  onCheckedChange={(v) => change('allDay', v === true)}
                />
                {t.allDay}
              </label>
              <input
                type="time"
                aria-label={t.days[i] + ' ' + t.from}
                required
                disabled={h.closed || h.allDay}
                value={h.open}
                onChange={(e) => change('open', e.target.value)}
              />
              <input
                type="time"
                aria-label={t.days[i] + ' ' + t.to}
                required
                disabled={h.closed || h.allDay}
                value={h.close}
                onChange={(e) => change('close', e.target.value)}
              />
            </div>
          );
        })}
      </section>
      <section className="form-section">
        <h2 className="field-title">{t.photo}</h2>
        {preview && (
          <div className="photo-preview">
            <Image
              src={preview}
              unoptimized
              alt={t.photo}
              fill
              sizes="180px"
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}
        <label className="button">
          <Upload size={18} />
          {t.upload}
          <input
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (
                  f.size > 4 * 1024 * 1024 ||
                  !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
                ) {
                  setError(t.photoHint);
                  return;
                }
                setPhoto(f);
                setRemovePhoto(false);
              }
            }}
          />
        </label>
        {preview && (
          <button
            type="button"
            className="button"
            onClick={() => {
              setPhoto(undefined);
              setPreview('');
              setRemovePhoto(true);
            }}
          >
            {t.photoRemove}
          </button>
        )}
        <p className="help">{t.photoHint}</p>
      </section>
      {admin && (
        <section className="form-section">
          <div className="field">
            <span>{t.status}</span>
            <Select
              value={status}
              onValueChange={(v) =>
                setStatus(v === 'pending' ? 'pending' : 'approved')
              }
            >
              <SelectTrigger className="field-input">
                <SelectValue>{t[status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">{t.approved}</SelectItem>
                <SelectItem value="pending">{t.pending}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="check-label mt-4">
            <Checkbox
              checked={demo}
              onCheckedChange={(v) => setDemo(v === true)}
            />
            {t.demoField}
          </label>
        </section>
      )}
      <label className="honeypot" aria-hidden>
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="button primary" disabled={busy}>
          {busy ? t.sending : admin ? t.save : t.submit}
        </button>
        {onCancel && (
          <button className="button" type="button" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
