'use client';
import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Customer marker (pulsing red dot)
const customerIcon = () =>
  L.divIcon({
    className: '',
    html: `<span class="dispatch-user-pin">
      <span class="dispatch-pulse-ring"></span>
      <span class="dispatch-pin-core"></span>
    </span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

// Fitter marker (moving truck)
const fitterIcon = () =>
  L.divIcon({
    className: 'pin-wrap',
    html: `<span class="map-pin mobile selected dispatch-fitter-pin">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </span>`,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    tooltipAnchor: [0, -52],
  });

function AutoBounds({
  userPos,
  fitterPos,
}: {
  userPos: [number, number];
  fitterPos?: [number, number];
}) {
  const map = useMap();
  useEffect(() => {
    if (fitterPos) {
      map.fitBounds(L.latLngBounds([userPos, fitterPos]), {
        padding: [40, 40],
        maxZoom: 16,
      });
    } else {
      map.setView(userPos, 15);
    }
  }, [map, userPos, fitterPos]);
  return null;
}

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export default function DispatchMap({
  userLat,
  userLng,
  fitterLat,
  fitterLng,
  mode,
  compact = false,
}: {
  userLat: number;
  userLng: number;
  fitterLat?: number;
  fitterLng?: number;
  mode: 'customer' | 'fitter';
  compact?: boolean;
}) {
  const userPos: [number, number] = [userLat, userLng];
  const fitterPos: [number, number] | undefined =
    fitterLat !== undefined && fitterLng !== undefined
      ? [fitterLat, fitterLng]
      : undefined;

  return (
    <div className={`dispatch-map-wrap ${compact ? 'compact' : ''}`}>
      <MapContainer
        center={userPos}
        zoom={15}
        minZoom={10}
        zoomControl={false}
        className="dispatch-leaflet-map"
      >
        <TileLayer url={OSM_URL} attribution={OSM_ATTRIB} maxZoom={19} />
        <ZoomControl position="bottomright" />

        {/* Customer location */}
        <Marker position={userPos} icon={customerIcon()}>
          <Tooltip direction="top" permanent className="dispatch-tooltip">
            {mode === 'fitter' ? '📍 شوێنی داواکار' : '📍 شوێنی من'}
          </Tooltip>
        </Marker>

        {/* Fitter live location */}
        {fitterPos && (
          <Marker position={fitterPos} icon={fitterIcon()}>
            <Tooltip direction="top" permanent className="dispatch-tooltip">
              {mode === 'customer' ? '🔧 فیتەر لە ڕێگایەوە' : '📌 من'}
            </Tooltip>
          </Marker>
        )}

        <AutoBounds userPos={userPos} fitterPos={fitterPos} />
      </MapContainer>
    </div>
  );
}
