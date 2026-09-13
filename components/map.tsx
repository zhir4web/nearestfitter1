'use client';
import { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sun, Moon, LocateFixed, Building2 } from 'lucide-react';
import type { Fitter } from '@/types';
import { CENTER } from '@/lib/geo';
import { useLanguage } from './language';

const pin = (type: string, selected = false) =>
  L.divIcon({
    className: 'pin-wrap',
    html: `<span class="map-pin ${type} ${selected ? 'selected' : ''}">
      ${
        type === 'mobile'
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="1" width="14" height="22" rx="3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>`
      }
    </span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    tooltipAnchor: [0, -48],
  });

const userMarkerIcon = () =>
  L.divIcon({
    className: '',
    html: `<span class="user-pin-wrap">
      <span class="user-pin-ring"></span>
      <span class="user-pin-dot"></span>
    </span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

function Controller({
  user,
  selected,
  fitters,
}: {
  user?: [number, number];
  selected?: string;
  fitters: Fitter[];
}) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && fitters.length) {
      map.fitBounds(
        L.latLngBounds(
          fitters.map((f) => [f.latitude, f.longitude] as [number, number]),
        ),
        { padding: [55, 65], maxZoom: 14 },
      );
      fitted.current = true;
    }
  }, [map, fitters]);
  useEffect(() => {
    if (user) map.flyTo(user, 14, { duration: 0.6 });
  }, [map, user]);
  useEffect(() => {
    const f = fitters.find((f) => f.id === selected);
    if (f) map.flyTo([f.latitude, f.longitude], 15, { duration: 0.5 });
  }, [selected, map, fitters]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function Picker({ onPick }: { onPick: (p: [number, number]) => void }) {
  useMapEvents({
    click: (e) =>
      onPick([
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
      ]),
  });
  return null;
}

function MapActions({
  user,
  dark,
  setDark,
}: {
  user?: [number, number];
  dark: boolean;
  setDark: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const map = useMap();
  const { t } = useLanguage();
  return (
    <div className="map-floating-controls">
      {user && (
        <button
          type="button"
          className="map-control-btn"
          onClick={() => map.flyTo(user, 15, { duration: 0.8 })}
          title={t.recenter}
          aria-label={t.recenter}
        >
          <LocateFixed size={18} />
        </button>
      )}
      <button
        type="button"
        className="map-control-btn"
        onClick={() => map.flyTo(CENTER, 13, { duration: 0.8 })}
        title={t.resetMap}
        aria-label={t.resetMap}
      >
        <Building2 size={18} />
      </button>
      <button
        type="button"
        className="map-control-btn"
        onClick={() => setDark((d) => !d)}
        title={dark ? 'ڕۆژ' : 'شەو'}
        aria-label={dark ? 'Switch to day map' : 'Switch to night map'}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}

// هەردوو مۆد هەمان OSM تایل بەکار دێت — تەنها CSS فلتەر دەگۆڕێت
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export default function FitterMap({
  fitters = [],
  selected,
  onSelect,
  user,
  pick,
  onPick,
}: {
  fitters?: Fitter[];
  selected?: string;
  onSelect?: (id: string) => void;
  user?: [number, number];
  pick?: [number, number];
  onPick?: (p: [number, number]) => void;
}) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  // بە شێوەی خۆکار لە ساتی ئێستا دەزانین شەوە یان ڕۆژ
  const [dark, setDark] = useState(() => {
    const h = new Date().getHours();
    return h >= 20 || h < 7; // شەو: 8PM → 7AM
  });

  return (
    <div className={`map-inner ${dark ? 'map-dark' : 'map-light'}`}>
      <MapContainer
        center={pick || CENTER}
        zoom={pick ? 14 : 13}
        minZoom={8}
        zoomControl={false}
        className="leaflet-map"
      >
        <MapActions user={user} dark={dark} setDark={setDark} />
        <TileLayer
          url={OSM_URL}
          attribution={OSM_ATTRIB}
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setFailed(true),
            tileload: () => setFailed(false),
          }}
        />
        <ZoomControl position="bottomleft" />
        {fitters.map((f) => (
          <Marker
            key={f.id}
            title={f.name}
            alt={f.name}
            position={[f.latitude, f.longitude]}
            icon={pin(f.type, selected === f.id)}
            eventHandlers={{ click: () => onSelect?.(f.id) }}
          >
            <Tooltip direction="top" className="map-tooltip">
              {f.name}
            </Tooltip>
          </Marker>
        ))}
        {user && (
          <Marker position={user} icon={userMarkerIcon()}>
            <Tooltip className="map-tooltip">{t.you}</Tooltip>
          </Marker>
        )}
        {pick && <Marker position={pick} icon={pin('fixed', true)} />}
        <Controller user={user} selected={selected} fitters={fitters} />
        {onPick && <Picker onPick={onPick} />}
      </MapContainer>

      {failed && (
        <p className="tile-error" role="status">
          {t.tileError}
        </p>
      )}
    </div>
  );
}
