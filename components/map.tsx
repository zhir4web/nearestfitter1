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
import type { Fitter } from '@/types';
import { CENTER } from '@/lib/geo';
import { useLanguage } from './language';
const pin = (type: string, selected = false) =>
  L.divIcon({
    className: 'pin-wrap',
    html: `<span class="map-pin ${type} ${selected ? 'selected' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 5v5m0 4v5M5 12h5m4 0h5"/></svg></span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
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
    if (user) map.flyTo(user, 14, { duration: 0.5 });
  }, [map, user]);
  useEffect(() => {
    const f = fitters.find((f) => f.id === selected);
    if (f) map.flyTo([f.latitude, f.longitude], 15, { duration: 0.4 });
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
  return (
    <div className="map-inner">
      <MapContainer
        center={pick || CENTER}
        zoom={pick ? 14 : 13}
        minZoom={8}
        zoomControl={false}
        className="leaflet-map"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
            <Tooltip direction="top">{f.name}</Tooltip>
          </Marker>
        ))}
        {user && (
          <Marker
            position={user}
            icon={L.divIcon({
              className: 'user-pin',
              html: '<span></span>',
              iconSize: [24, 24],
            })}
          >
            <Tooltip>{t.you}</Tooltip>
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
