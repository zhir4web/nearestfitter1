'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Search,
  LocateFixed,
  ArrowUpLeft,
  MapPin,
  Truck,
  Store,
  Star,
  SlidersHorizontal,
  ArrowUpRight,
  Navigation,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Phone,
  MessageCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { useLanguage } from './language';
import { distance, CENTER, opening } from '@/lib/geo';
import { services, type Fitter } from '@/types';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Detail } from './detail';

const SULA_NEIGHBORHOODS = [
  'all',
  'شەقامی بازنەیی مەلیک مەحمود',
  'سەرچنار',
  'تووی مەلیك',
  'بەختیاری',
  'ڕاپەڕین',
  'تاسڵوجە',
  'هوانە',
  'ئیبراهیم ئەحمەد',
  'قالاوا',
  'ڕزگاری',
];
const Map = dynamic(() => import('./map'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});
export function Directory() {
  const { t, lang } = useLanguage();
  const [fitters, setFitters] = useState<Fitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [service, setService] = useState('all');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('all');
  const [is24Hours, setIs24Hours] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [user, setUser] = useState<[number, number]>();
  const [selected, setSelected] = useState<string>();
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(new Date());
  const drag = useRef(0);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch('/api/fitters');
      if (!r.ok) throw Error();
      setFitters(await r.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const filtered = useMemo(
    () =>
      fitters
        .filter(
          (f) =>
            (f.name + ' ' + f.neighborhood)
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()) &&
            (type === 'all' || f.type === type) &&
            (service === 'all' || (f.services ?? []).includes(service)) &&
            (selectedNeighborhood === 'all' ||
              (f.neighborhood || '')
                .toLocaleLowerCase()
                .includes(selectedNeighborhood.toLocaleLowerCase())) &&
            (!openOnly || opening(f.working_hours, now).open) &&
            (!is24Hours || f.working_hours?.some((h) => h.allDay)),
        )
        .map((f) => {
          const dist = distance(user || CENTER, [f.latitude, f.longitude]);
          return {
            ...f,
            distance: dist,
            driveMinutes: Math.max(2, Math.ceil(dist * 2.2)),
          };
        })
        .sort((a, b) => a.distance - b.distance),
    [
      fitters,
      query,
      type,
      service,
      selectedNeighborhood,
      openOnly,
      is24Hours,
      user,
      now,
    ],
  );
  function locate() {
    setLocating(true);
    setGeoError(false);
    if (!navigator.geolocation) {
      setGeoError(true);
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setUser([p.coords.latitude, p.coords.longitude]);
        setLocating(false);
      },
      () => {
        setGeoError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }
  const chosen = fitters.find((f) => f.id === selected);

  return (
    <main className="directory">
      <aside className={'results-panel ' + (expanded ? 'expanded' : '')}>
        <button
          className="sheet-handle"
          aria-label={t.listToggle}
          aria-expanded={expanded}
          onClick={(e) => {
            if (e.detail === 0) setExpanded(!expanded);
          }}
          onPointerDown={(e) => {
            drag.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerUp={(e) => {
            const delta = e.clientY - drag.current;
            setExpanded(Math.abs(delta) > 15 ? delta < 0 : !expanded);
          }}
        >
          <span />
        </button>
        <div className="finder-intro">
          {/* Emergency SOS Quick Card */}
          <div className="sos-banner">
            <div className="sos-header">
              <span className="sos-badge">
                <span className="sos-pulse" />
                {t.sosBadge}
              </span>
            </div>
            <button
              type="button"
              className="button sos-btn"
              onClick={() => {
                setType('mobile');
                setOpenOnly(true);
                locate();
              }}
            >
              <Zap size={15} />
              {t.sosButton}
            </button>
          </div>

          <div className="eyebrow">
            <span className="live-dot" />
            {t.city} <span className="eyebrow-line" /> ROADSIDE ASSISTANCE
          </div>
          <h1>
            {t.headline}
            <br />
            <span>{t.subline}</span>
          </h1>
          <div className="search-field">
            <Search size={20} />
            <input
              aria-label={t.search}
              placeholder={t.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label={t.clear} onClick={() => setQuery('')}>
                ×
              </button>
            )}
          </div>
          <button
            className="button primary locate"
            onClick={locate}
            disabled={locating}
          >
            <LocateFixed size={19} className={locating ? 'spin' : ''} />
            {locating ? t.locating : t.locate}
            <Navigation size={16} />
          </button>
          {/* Dispatch request button */}
          {user && (
            <Link
              href={`/request-help?lat=${user[0]}&lng=${user[1]}`}
              className="button dispatch-btn"
              id="request-help-btn"
            >
              <AlertTriangle size={17} />
              {t.requestHelp}
            </Link>
          )}
          {geoError && (
            <p className="error" role="alert">
              {t.geoError}
            </p>
          )}
          <div className="filter-chips">
            {[
              ['all', t.all],
              ['fixed', t.fixed],
              ['mobile', t.mobile],
            ].map(([v, label]) => (
              <button
                key={v}
                className={type === v ? 'active' : ''}
                aria-pressed={type === v}
                onClick={() => setType(v)}
              >
                {v === 'fixed' ? (
                  <Store size={15} />
                ) : v === 'mobile' ? (
                  <Truck size={15} />
                ) : null}
                {label}
              </button>
            ))}
          </div>
          {/* فیلتەری خزمەتگوزاری */}
          <div className="filter-chips service-chips">
            {([
              ['all', t.allServices],
              ['puncture', t.serviceLabels.puncture],
              ['change', t.serviceLabels.change],
              ['balance', t.serviceLabels.balance],
              ['alignment', t.serviceLabels.alignment],
              ['sales', t.serviceLabels.sales],
              ['roadside', t.serviceLabels.roadside],
            ] as [string, string][]).map(([v, label]) => (
              <button
                key={v}
                className={service === v ? 'active' : ''}
                aria-pressed={service === v}
                onClick={() => setService(v)}
              >
                {label}
              </button>
            ))}
          </div>
          {/* فیلتەری گەڕەکەکانی سلێمانی */}
          <div className="filter-chips neighborhood-chips" aria-label={t.neighborhoods}>
            {SULA_NEIGHBORHOODS.map((nh) => (
              <button
                key={nh}
                className={selectedNeighborhood === nh ? 'active' : ''}
                aria-pressed={selectedNeighborhood === nh}
                onClick={() => setSelectedNeighborhood(nh)}
              >
                <MapPin size={12} />
                {nh === 'all' ? t.allAreas : nh}
              </button>
            ))}
          </div>
          <div className="filter-row">
            <button
              className={'open-chip ' + (openOnly ? 'active' : '')}
              aria-pressed={openOnly}
              onClick={() => setOpenOnly(!openOnly)}
            >
              <span className="live-dot" />
              {t.open}
            </button>
            <button
              className={'open-chip ' + (is24Hours ? 'active' : '')}
              aria-pressed={is24Hours}
              onClick={() => setIs24Hours(!is24Hours)}
            >
              <Clock size={13} />
              {t.hours24}
            </button>
          </div>
        </div>
        <div className="results-heading">
          <h2>{user ? t.nearest : t.nearby}</h2>
          <span>
            {filtered.length} {t.results}
          </span>
        </div>
        <div className="result-scroll">
          {!user && <p className="distance-note">{t.center}</p>}
          {loading ? (
            <div className="skeletons">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="empty">
              <p>{t.network}</p>
              <button className="button" onClick={load}>
                <RotateCw size={16} />
                {t.retry}
              </button>
            </div>
          ) : !filtered.length ? (
            <div className="empty">
              <Search />
              <h3>{t.empty}</h3>
              <button
                className="button"
                onClick={() => {
                  setQuery('');
                  setType('all');
                  setService('all');
                  setSelectedNeighborhood('all');
                  setOpenOnly(false);
                  setIs24Hours(false);
                }}
              >
                {t.clear}
              </button>
            </div>
          ) : (
            filtered.map((f, i) => (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(f.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(f.id);
                  }
                }}
                className={
                  'fitter-card ' +
                  (user && i < 5 ? 'nearest-card ' : '') +
                  f.type +
                  (f.is_busy ? ' busy-card' : '')
                }
              >
                <div className={'fitter-symbol ' + f.type}>
                  {f.type === 'mobile' ? (
                    <Truck size={26} />
                  ) : (
                    <Store size={26} />
                  )}
                </div>
                <div className="card-main">
                  <div className="card-title">
                    <h3>{f.name}</h3>
                    {f.demo && <span className="demo-tag">{t.demo}</span>}
                    {f.is_busy ? (
                      <span className="busy-badge">🔴 مەشخوڵە</span>
                    ) : opening(f.working_hours, now).open ? (
                      <span className="available-badge">✅ بەردەستە</span>
                    ) : null}
                  </div>
                  <p>
                    <MapPin size={13} />
                    {f.neighborhood}
                  </p>
                  <div className="card-tags">
                    <span
                      className={
                        opening(f.working_hours, now).open
                          ? 'open-text'
                          : 'muted'
                      }
                    >
                      <i />
                      {opening(f.working_hours, now).open ? t.open : t.closed}
                    </span>
                    <span>{t[f.type]}</span>
                    {f.working_hours?.some((h) => h.allDay) && (
                      <span className="badge-24h">24/7</span>
                    )}
                  </div>
                  <div className="card-bottom">
                    <span className="rating">
                      <Star size={14} />
                      {f.review_count ? f.rating?.toFixed(1) : '—'}{' '}
                      <small>({f.review_count || 0})</small>
                    </span>
                    <span className="distance">
                      {f.distance.toFixed(1)} {user ? t.away : t.km}
                      <small className="drive-time">
                        {' '}
                        · ~{f.driveMinutes} {t.estimatedDrive}
                      </small>
                    </span>
                    {lang === 'en' ? (
                      <ArrowUpRight size={18} />
                    ) : (
                      <ArrowUpLeft size={18} />
                    )}
                  </div>

                  {/* 1-Tap Quick Action Buttons */}
                  {f.phone && (
                    <div className="card-quick-actions">
                      <a
                        href={'tel:' + f.phone}
                        className="quick-action-btn call"
                        onClick={(e) => e.stopPropagation()}
                        title={t.quickCall}
                      >
                        <Phone size={13} />
                        <span>{t.quickCall}</span>
                      </a>
                      {f.whatsapp && (
                        <a
                          href={
                            'https://wa.me/' +
                            f.whatsapp.replace(/[^0-9]/g, '') +
                            '?text=' +
                            encodeURIComponent(
                              t.whatsappPrefill.replace(
                                '[NEIGHBORHOOD]',
                                f.neighborhood || t.city,
                              ),
                            )
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="quick-action-btn whatsapp"
                          onClick={(e) => e.stopPropagation()}
                          title={t.quickWhatsApp}
                        >
                          <MessageCircle size={13} />
                          <span>{t.quickWhatsApp}</span>
                        </a>
                      )}
                      {/* Direct dispatch button (only if user location known + fitter open + not busy) */}
                      {user && !f.is_busy && opening(f.working_hours, now).open && !f.demo && (
                        <Link
                          href={`/request-help?lat=${user[0]}&lng=${user[1]}`}
                          className="quick-action-btn dispatch"
                          onClick={(e) => e.stopPropagation()}
                          title={t.requestHelp}
                        >
                          <AlertTriangle size={13} />
                          <span>{t.requestHelp}</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div className="directory-links">
            <Link href="/about">{t.about}</Link>
            <Link href="/contact">{t.contact}</Link>
            <Link href="/admin">{t.admin}</Link>
          </div>
        </div>
        <div className="panel-footer">
          <span className="live-dot" />
          {t.verifiedNote}
          <span>35.56° N / 45.43° E</span>
        </div>
      </aside>
      <section className="map-surface" aria-label={t.fullMap}>
        <Map
          fitters={filtered}
          selected={selected}
          onSelect={setSelected}
          user={user}
        />
        <div className="map-info-cluster">
          <div className="map-caption">
            <span className="live-dot" />
            {t.city}
            <small>KURDISTAN REGION · IRAQ</small>
          </div>
          <div className="map-legend">
            <span>
              <i className="fixed-dot" />
              {t.fixed}
            </span>
            <span>
              <i className="mobile-dot" />
              {t.mobile}
            </span>
          </div>
        </div>
        {fitters.some((f) => f.demo) && (
          <div className="demo-banner">{t.demoBanner}</div>
        )}
      </section>
      {chosen && (
        <Detail
          fitter={chosen}
          user={user}
          onClose={() => setSelected(undefined)}
        />
      )}
    </main>
  );
}

