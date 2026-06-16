import type * as Leaflet from 'leaflet';

export type PinVariant = 'primary' | 'accent' | 'community' | 'premium';

export function createMapPin(L: typeof Leaflet, variant: PinVariant = 'primary'): Leaflet.DivIcon {
  const gradientId = `pin-grad-${variant}`;

  const colors = variant === 'primary'
    ? { from: '#0E7490', to: '#0A4A5C' }
    : variant === 'accent'
    ? { from: '#F59E0B', to: '#D97706' }
    : variant === 'premium'
    ? { from: '#F59E0B', to: '#B45309' }
    : { from: '#16A34A', to: '#0E7A35' };

  const isPremium = variant === 'premium';

  let svg: string;
  if (isPremium) {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="39" height="53" viewBox="0 0 39 53">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.from}"/>
      <stop offset="100%" stop-color="${colors.to}"/>
    </linearGradient>
  </defs>
  <path d="M19.5 1C11.492 1 5 7.492 5 15.5c0 12.077 14.5 35 14.5 35S34 27.577 34 15.5C34 7.492 27.508 1 19.5 1z" fill="url(#${gradientId})" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
  <circle cx="19.5" cy="15.5" r="9" fill="white" opacity="0.95"/>
  <text x="19.5" y="20" text-anchor="middle" font-size="12" font-family="serif">🐟</text>
</svg>`;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
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
  }

  return L.divIcon({
    className: `brand-pin brand-pin--${variant}`,
    html: svg,
    iconSize: isPremium ? [39, 53] : [34, 46],
    iconAnchor: isPremium ? [19, 51] : [17, 44],
    popupAnchor: isPremium ? [0, -46] : [0, -40],
  });
}

export function createRegionBubble(L: typeof Leaflet, count: number): Leaflet.DivIcon {
  // Size scales gently with count (clamped). Brand teal gradient circle with the count.
  const size = Math.max(38, Math.min(64, 34 + count * 2));
  const html = `<div class="region-bubble" style="width:${size}px;height:${size}px">
    <span class="region-bubble__count">${count}</span>
  </div>`;
  return L.divIcon({
    className: 'region-bubble-wrap',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
