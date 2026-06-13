import type * as Leaflet from 'leaflet';

export type PinVariant = 'primary' | 'accent' | 'community';

export function createMapPin(L: typeof Leaflet, variant: PinVariant = 'primary'): Leaflet.DivIcon {
  const gradientId = `pin-grad-${variant}`;
  const filterId = `pin-shadow-${variant}`;

  const colors = variant === 'primary'
    ? { from: '#0E7490', to: '#0A4A5C' }
    : variant === 'accent'
    ? { from: '#F59E0B', to: '#D97706' }
    : { from: '#16A34A', to: '#0E7A35' };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.from}"/>
      <stop offset="100%" stop-color="${colors.to}"/>
    </linearGradient>
  </defs>
  <path d="M17 1C9.268 1 3 7.268 3 15c0 10.5 14 30 14 30S31 25.5 31 15C31 7.268 24.732 1 17 1z" fill="url(#${gradientId})" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
  <circle cx="17" cy="15" r="8" fill="white" opacity="0.95"/>
  <text x="17" y="19" text-anchor="middle" font-size="11" font-family="serif">🐟</text>
</svg>`;

  return L.divIcon({
    className: `brand-pin brand-pin--${variant}`,
    html: svg,
    iconSize: [34, 46],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
  });
}
