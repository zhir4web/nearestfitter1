'use client';
import { Moon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Crosshair, Heart, LocateFixed, MapPin, MessageSquare, Navigation, Search, Settings2, ShieldCheck, Star, Store, Truck, Wrench, X } from 'lucide-react';
import { opening, distance, CENTER } from '@/lib/geo';
import type { Fitter, Language } from '@/types';
import { useLanguage } from './language';
import { usePreferences } from './preferences';
import { Footer } from './header';
import { appCopy } from '@/lib/app-copy';

const FitterMap = dynamic(() => import('./map'), { ssr: false, loading: () => <div className="nf-map-loading"><span /></div> });

function useFitters() {
  const [fitters, setFitters] = useState<Fitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = async () => {
    setLoading(true); setError(false);
    try { const response = await fetch('/api/fitters', { cache: 'no-store' }); if (!response.ok) throw new Error(); setFitters(await response.json() as Fitter[]); }
    catch { setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return { fitters, loading, error, retry: load };
}

function BackLink({ href = '/' }: { href?: string }) {
  const { lang } = useLanguage();
  return <Link className="nf-back-link" href={href}>{lang === 'en' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}<span>{lang === 'en' ? 'Back' : lang === 'ar' ? 'رجوع' : 'گەڕانەوە'}</span></Link>;
}

function FitterCard({ fitter, user, compact = false }: { fitter: Fitter; user?: [number, number]; compact?: boolean }) {
  const { t, lang } = useLanguage();
  const copy = appCopy[lang];
  const { favorites, toggleFavorite } = usePreferences();
  const isOpen = opening(fitter.working_hours || [], new Date()).open;
  const km = distance(user || CENTER, [fitter.latitude, fitter.longitude]);
  const saved = favorites.includes(fitter.id);
  return <article className={'nf-fitter-card ' + (compact ? 'compact' : '')}>
    <div className="nf-card-top"><span className={'nf-type-icon ' + fitter.type}>{fitter.type === 'mobile' ? <Truck size={22} /> : <Store size={22} />}</span><div className="nf-card-top-copy"><span className="nf-overline">{fitter.type === 'mobile' ? t.mobile : t.fixed}</span><span className={'nf-availability ' + (fitter.is_busy ? 'busy' : isOpen ? 'open' : 'closed')}><i />{fitter.is_busy ? copy.busy : isOpen ? copy.available : t.closed}</span></div><button type="button" className={'nf-heart ' + (saved ? 'saved' : '')} aria-label={saved ? copy.unsave : copy.save} aria-pressed={saved} onClick={() => toggleFavorite(fitter.id)}><Heart size={19} fill={saved ? 'currentColor' : 'none'} /></button></div>
    <Link href={'/map?fitter=' + encodeURIComponent(fitter.id)} className="nf-card-link"><h3>{fitter.name}</h3><p className="nf-card-location"><MapPin size={15} />{fitter.neighborhood || copy.currentArea}</p><div className="nf-card-meta"><span><Navigation size={14} />{km.toFixed(1)} {lang === 'en' ? 'km' : 'کم'}</span><span><Star size={14} fill="currentColor" />{fitter.review_count ? fitter.rating?.toFixed(1) : copy.noRating}</span><span><Clock3 size={14} />{fitter.working_hours?.some((item) => item.allDay) ? copy.allDay : t.hours}</span></div><div className="nf-service-row">{(fitter.services || []).slice(0, compact ? 2 : 4).map((service) => <span key={service}>{t.serviceLabels?.[service as keyof typeof t.serviceLabels] || service}</span>)}</div></Link>
    <div className="nf-card-bottom"><span className="nf-card-note">{fitter.is_online ? <><span className="nf-live-dot" />{copy.available}</> : copy.private}</span><Link href={'/map?fitter=' + encodeURIComponent(fitter.id)} className="nf-text-link">{t.details}<ArrowLeft size={14} /></Link></div>
  </article>;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="nf-section-heading"><div>{eyebrow && <span className="nf-eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>;
}

export function HomeDashboard() {
  const { t, lang } = useLanguage(); const copy = appCopy[lang]; const { fitters, loading, error, retry } = useFitters(); const { user, locate, locating, geoError } = usePreferences();
  const featured = useMemo(() => [...fitters].sort((a, b) => distance(user || CENTER, [a.latitude, a.longitude]) - distance(user || CENTER, [b.latitude, b.longitude])).slice(0, 3), [fitters, user]);
  const online = fitters.filter((f) => f.is_online && !f.is_busy).length;
  return <main id="main-content" className="nf-main"><section className="nf-shell nf-hero"><div className="nf-hero-copy"><span className="nf-eyebrow"><span className="nf-live-dot" />{copy.network}</span><h1>{copy.headline}</h1><p>{copy.intro}</p><div className="nf-hero-actions"><button className="nf-button primary" type="button" onClick={locate} disabled={locating}><LocateFixed size={18} />{locating ? t.locating : copy.request}</button><Link className="nf-button ghost" href="/map"><MapPin size={18} />{copy.browse}</Link></div>{geoError && <p className="nf-inline-error" role="alert">{t.geoError}</p>}<div className="nf-trust-row"><span><ShieldCheck size={15} />{copy.private}</span><span><CheckCircle2 size={15} />{online} {lang === 'en' ? 'available now' : lang === 'ar' ? 'متاح الآن' : 'بەردەستە ئێستا'}</span></div></div><div className="nf-hero-visual"><div className="nf-orbit orbit-one" /><div className="nf-orbit orbit-two" /><div className="nf-hero-pin"><Wrench size={34} /></div><div className="nf-hero-float float-one"><span className="nf-mini-icon green"><CheckCircle2 size={16} /></span><span><b>{copy.available}</b><small>{copy.currentArea}</small></span></div><div className="nf-hero-float float-two"><Navigation size={17} /><span><b>{copy.fromYou}</b><small>2.4 {lang === 'en' ? 'km away' : 'کم لێرەوە'}</small></span></div></div></section><section className="nf-shell nf-quick-grid"><Link href="/request-help" className="nf-quick-card accent"><span className="nf-quick-icon"><Crosshair size={21} /></span><span><b>{copy.help}</b><small>{copy.helpText}</small></span><ArrowLeft size={17} /></Link><Link href="/community" className="nf-quick-card"><span className="nf-quick-icon amber"><MessageSquare size={21} /></span><span><b>{copy.communityTitle}</b><small>{copy.communityText}</small></span><ArrowLeft size={17} /></Link></section><section className="nf-shell nf-section"><SectionHeading eyebrow={copy.network} title={copy.allFitters} action={<Link className="nf-text-link" href="/map">{copy.explore}<ArrowLeft size={14} /></Link>} />{loading ? <div className="nf-card-grid">{[1, 2, 3].map((n) => <div className="nf-skeleton-card" key={n}><span /><span /><span /></div>)}</div> : error ? <div className="nf-empty"><p>{t.network}</p><button className="nf-button ghost" onClick={() => void retry()}>{t.retry}</button></div> : featured.length ? <div className="nf-card-grid">{featured.map((f) => <FitterCard key={f.id} fitter={f} user={user} />)}</div> : <div className="nf-empty"><p>{copy.savedEmpty}</p></div>}</section><section className="nf-shell nf-story-card"><div><span className="nf-eyebrow">{copy.how}</span><h2>{copy.mapTitle}</h2><p>{copy.mapText}</p><Link className="nf-button ghost" href="/map">{copy.explore}<ArrowLeft size={15} /></Link></div><div className="nf-step-list">{copy.steps.map((step, index) => <div className="nf-step" key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></div>)}</div></section><section className="nf-shell nf-section nf-community-callout"><div><span className="nf-eyebrow">{copy.communityTitle}</span><h2>{copy.communityText}</h2></div><Link href="/community" className="nf-button primary">{copy.communityAction}<ArrowLeft size={16} /></Link></section><Footer /></main>;
}

function FilterControls({ query, setQuery, type, setType, service, setService, openOnly, setOpenOnly }: { query: string; setQuery: (v: string) => void; type: string; setType: (v: string) => void; service: string; setService: (v: string) => void; openOnly: boolean; setOpenOnly: (v: boolean) => void }) {
  const { t, lang } = useLanguage(); const copy = appCopy[lang];
  return <div className="nf-filter-panel"><label className="nf-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} />{query && <button type="button" onClick={() => setQuery('')} aria-label={t.clear}><X size={15} /></button>}</label><div className="nf-filter-row"><button type="button" className={type === 'all' ? 'active' : ''} onClick={() => setType('all')}>{copy.allFitters}</button><button type="button" className={type === 'fixed' ? 'active' : ''} onClick={() => setType('fixed')}><Store size={15} />{t.fixed}</button><button type="button" className={type === 'mobile' ? 'active' : ''} onClick={() => setType('mobile')}><Truck size={15} />{t.mobile}</button><button type="button" className={openOnly ? 'active' : ''} onClick={() => setOpenOnly(!openOnly)}><span className="nf-live-dot" />{copy.openOnly}</button></div><div className="nf-service-filter"><button type="button" className={service === 'all' ? 'active' : ''} onClick={() => setService('all')}>{t.allServices}</button>{(['puncture', 'change', 'balance', 'alignment', 'sales', 'roadside'] as const).map((value) => <button type="button" key={value} className={service === value ? 'active' : ''} onClick={() => setService(value)}>{t.serviceLabels[value]}</button>)}</div></div>;
}

export function MapDirectory() {
  const { t, lang } = useLanguage(); const copy = appCopy[lang]; const { fitters, loading, error } = useFitters(); const { user, locate, locating } = usePreferences(); const searchParams = useSearchParams();
  const [query, setQuery] = useState(''); const [type, setType] = useState('all'); const [service, setService] = useState('all'); const [openOnly, setOpenOnly] = useState(false); const [selected, setSelected] = useState<string | undefined>(searchParams.get('fitter') || undefined);
  const filtered = useMemo(() => fitters.filter((f) => (!query || `${f.name} ${f.neighborhood}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())) && (type === 'all' || f.type === type) && (service === 'all' || (f.services || []).includes(service)) && (!openOnly || opening(f.working_hours || []).open)).sort((a, b) => distance(user || CENTER, [a.latitude, a.longitude]) - distance(user || CENTER, [b.latitude, b.longitude])), [fitters, query, type, service, openOnly, user]);
  return <main id="main-content" className="nf-main"><div className="nf-shell nf-page-top"><BackLink /><div><span className="nf-eyebrow">{copy.network}</span><h1>{copy.mapTitle}</h1><p>{copy.mapText}</p></div><button className="nf-button ghost" onClick={locate} disabled={locating}><LocateFixed size={17} />{locating ? t.locating : copy.fromYou}</button></div><section className="nf-shell nf-map-layout"><div className="nf-map-wrap"><FitterMap fitters={filtered} user={user} selected={selected} onSelect={setSelected} /><div className="nf-map-legend"><span><i className="fixed-dot" />{t.fixed}</span><span><i className="mobile-dot" />{t.mobile}</span><span><i className="nf-live-dot" />{copy.available}</span></div></div><aside className="nf-map-sidebar"><FilterControls query={query} setQuery={setQuery} type={type} setType={setType} service={service} setService={setService} openOnly={openOnly} setOpenOnly={setOpenOnly} /><div className="nf-sidebar-heading"><h2>{filtered.length} {copy.list}</h2><span>{user ? copy.fromYou : copy.currentArea}</span></div><div className="nf-sidebar-list">{loading ? <div className="nf-loading-lines"><span /><span /><span /></div> : error ? <div className="nf-empty"><p>{t.network}</p></div> : filtered.length ? filtered.map((f) => <FitterCard key={f.id} fitter={f} user={user} compact />) : <div className="nf-empty"><Search size={22} /><p>{t.empty}</p></div>}</div></aside></section><Footer /></main>;
}

export function FavoritesPage() {
  const { t, lang } = useLanguage(); const copy = appCopy[lang]; const { fitters, loading } = useFitters(); const { favorites, user } = usePreferences();
  const saved = fitters.filter((f) => favorites.includes(f.id));
  return <main id="main-content" className="nf-main"><div className="nf-shell nf-page-top"><BackLink /><div><span className="nf-eyebrow"><Heart size={14} />{copy.favorites}</span><h1>{copy.saved}</h1><p>{copy.savedText}</p></div></div><section className="nf-shell nf-section">{loading ? <div className="nf-card-grid">{[1, 2].map((n) => <div className="nf-skeleton-card" key={n}><span /><span /></div>)}</div> : saved.length ? <div className="nf-card-grid">{saved.map((f) => <FitterCard key={f.id} fitter={f} user={user} />)}</div> : <div className="nf-empty nf-empty-large"><Heart size={30} /><h2>{copy.savedEmpty}</h2><p>{copy.savedHint}</p><Link className="nf-button primary" href="/map">{copy.browse}<MapPin size={16} /></Link></div>}</section><Footer /></main>;
}

export function SettingsPage() {
  const { t, lang, setLang } = useLanguage(); const copy = appCopy[lang]; const { theme, setTheme, user, locate, clearLocation, locating } = usePreferences(); const [shared, setShared] = useState(false);
  const share = async () => { try { if (navigator.share) await navigator.share({ title: t.brand, text: copy.intro, url: window.location.origin }); else { await navigator.clipboard.writeText(window.location.origin); setShared(true); setTimeout(() => setShared(false), 2200); } } catch { /* user dismissed */ } };
  const themes: [string, 'dark' | 'light' | 'auto', React.ReactNode][] = [[copy.dark, 'dark', <Moon key="dark" size={18} />], [copy.light, 'light', <SunIcon key="light" />], [copy.system, 'auto', <Settings2 key="auto" size={18} />]];
  return <main id="main-content" className="nf-main"><div className="nf-shell nf-page-top"><BackLink /><div><span className="nf-eyebrow"><Settings2 size={14} />{copy.settings}</span><h1>{copy.preferences}</h1><p>{copy.settingsIntro}</p></div></div><section className="nf-shell nf-settings-grid"><div className="nf-settings-main"><section className="nf-settings-card"><div className="nf-settings-card-head"><span className="nf-settings-icon"><SunIcon /></span><div><h2>{copy.appearance}</h2><p>{copy.settingsIntro}</p></div></div><div className="nf-segmented">{themes.map(([label, value, icon]) => <button type="button" key={value} className={theme === value ? 'active' : ''} onClick={() => setTheme(value)}>{icon}<span>{label}</span></button>)}</div></section><section className="nf-settings-card"><div className="nf-settings-card-head"><span className="nf-settings-icon"><GlobeIcon /></span><div><h2>{t.language}</h2><p>{lang === 'ckb' ? 'زمانی خۆت هەڵبژێرە' : 'Choose the language you prefer'}</p></div></div><div className="nf-segmented">{([['ckb', 'کوردی'], ['en', 'English'], ['ar', 'العربية']] as [Language, string][]).map(([value, label]) => <button type="button" key={value} className={lang === value ? 'active' : ''} onClick={() => setLang(value)}>{label}</button>)}</div></section><section className="nf-settings-card"><div className="nf-settings-card-head"><span className="nf-settings-icon"><LocateFixed /></span><div><h2>{copy.location}</h2><p>{copy.locationHint}</p></div></div><div className="nf-location-status"><span className={user ? 'on' : ''}><i />{user ? copy.enabled : copy.disabled}</span>{user ? <button type="button" className="nf-text-button" onClick={clearLocation}>{t.clear}</button> : <button type="button" className="nf-button ghost small" onClick={locate} disabled={locating}>{locating ? t.locating : t.locate}</button>}</div></section></div><aside className="nf-settings-side"><div className="nf-settings-aside-card"><span className="nf-settings-icon amber"><Navigation size={19} /></span><h2>{copy.install}</h2><p>{copy.installHint}</p></div><button type="button" className="nf-settings-aside-card share" onClick={() => void share()}><span className="nf-settings-icon"><ArrowUpShare /></span><h2>{shared ? copy.copied : copy.share}</h2><p>{copy.private}</p></button><div className="nf-settings-aside-card"><span className="nf-settings-icon"><ShieldCheck size={19} /></span><h2>{copy.privacy}</h2><p>{copy.localSaved}</p><div className="nf-aside-links"><Link href="/about">{copy.about}</Link><Link href="/contact">{t.contact}</Link></div></div></aside></section><Footer /></main>;
}

function SunIcon() { return <span className="nf-icon-svg"><span className="sun-core" /><span className="sun-rays" /></span>; }
function GlobeIcon() { return <span className="nf-globe-icon">◎</span>; }
function ArrowUpShare() { return <span className="nf-share-icon">↗</span>; }
