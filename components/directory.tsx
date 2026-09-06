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
            (!openOnly || opening(f.working_hours, now).open),
        )
        .map((f) => ({
          ...f,
          distance: distance(user || CENTER, [f.latitude, f.longitude]),
        }))
        .sort((a, b) => a.distance - b.distance),
    [fitters, query, type, openOnly, user, now],
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
          <div className="filter-row">
            <button
              className={'open-chip ' + (openOnly ? 'active' : '')}
              aria-pressed={openOnly}
              onClick={() => setOpenOnly(!openOnly)}
            >
              <span className="live-dot" />
              {t.open}
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
                  setOpenOnly(false);
                }}
              >
                {t.clear}
              </button>
            </div>
          ) : (
            filtered.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setSelected(f.id)}
                className={
                  'fitter-card ' + (user && i < 5 ? 'nearest-card' : '')
                }
              >
                <div className={'fitter-symbol ' + f.type}>
                  {f.type === 'mobile' ? (
                    <Truck size={27} />
                  ) : (
                    <Store size={27} />
                  )}
                </div>
                <div className="card-main">
                  <div className="card-title">
                    <h3>{f.name}</h3>
                    {f.demo && <span className="demo-tag">{t.demo}</span>}
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
                  </div>
                  <div className="card-bottom">
                    <span className="rating">
                      <Star size={14} />
                      {f.review_count ? f.rating?.toFixed(1) : '—'}{' '}
                      <small>({f.review_count || 0})</small>
                    </span>
                    <span className="distance">
                      {f.distance.toFixed(1)} {user ? t.away : t.km}
                    </span>
                    {lang === 'en' ? (
                      <ArrowUpRight size={19} />
                    ) : (
                      <ArrowUpLeft size={19} />
                    )}
                  </div>
                </div>
              </button>
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

