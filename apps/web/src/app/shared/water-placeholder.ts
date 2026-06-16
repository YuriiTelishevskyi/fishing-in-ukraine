import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { WaterType } from '@fishing/shared';

/** Two-stop gradient (deg + colors) per water type. Hue shifts slightly per seed. */
interface Theme {
  from: string;
  to: string;
  glyph: string;
}

const THEMES: Record<WaterType, Theme> = {
  // teal → deep blue
  LAKE: { from: '#0E7490', to: '#0A4A5C', glyph: '🌊' },
  // teal → green
  RIVER: { from: '#0E7490', to: '#16A34A', glyph: '🏞' },
  // slate-blue → deep
  RESERVOIR: { from: '#3F5C78', to: '#04222C', glyph: '🌊' },
  // green → teal
  POND: { from: '#16A34A', to: '#0E7490', glyph: '🌿' },
  // amber → teal
  FISHING_COMPLEX: { from: '#F59E0B', to: '#0E7490', glyph: '🎣' },
};

const FALLBACK: Theme = { from: '#0E7490', to: '#0A4A5C', glyph: '🐟' };

/** Tiny deterministic string hash (FNV-1a-ish) → unsigned int. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Shift an #rrggbb hex color's hue by `deg` degrees, keeping it deterministic & cheap. */
function hueShift(hex: string, deg: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  // RGB → HSL
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  h = (h + deg + 360) % 360;
  // HSL → RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rr = 0, gg = 0, bb = 0;
  if (h < 60) [rr, gg, bb] = [c, x, 0];
  else if (h < 120) [rr, gg, bb] = [x, c, 0];
  else if (h < 180) [rr, gg, bb] = [0, c, x];
  else if (h < 240) [rr, gg, bb] = [0, x, c];
  else if (h < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];
  r = Math.round((rr + m) * 255);
  g = Math.round((gg + m) * 255);
  b = Math.round((bb + m) * 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Premium "no photo" placeholder: a water-type-themed gradient + subtle SVG wave
 * pattern + a centered type glyph. Deterministic slight hue variation per `seed`
 * (the water slug) so cards don't look identical. Pure CSS/SVG, SSR-safe, OnPush.
 */
@Component({
  selector: 'app-water-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './water-placeholder.scss',
  template: `
    <div class="wph" [style.background]="gradient()">
      <svg
        class="wph__waves"
        viewBox="0 0 400 250"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          d="M0,160 C70,130 130,190 200,160 C270,130 330,190 400,160 L400,250 L0,250 Z"
          fill="rgba(255,255,255,0.10)"
        />
        <path
          d="M0,190 C80,160 140,220 210,190 C280,160 340,220 400,190 L400,250 L0,250 Z"
          fill="rgba(255,255,255,0.07)"
        />
        <path
          d="M0,55 C90,35 150,75 220,55 C290,35 350,75 400,55 L400,0 L0,0 Z"
          fill="rgba(255,255,255,0.05)"
        />
      </svg>
      <span class="wph__glyph" aria-hidden="true">{{ glyph() }}</span>
    </div>
  `,
})
export class WaterPlaceholder {
  readonly type = input<WaterType>();
  readonly seed = input<string>('');

  private readonly theme = computed<Theme>(() => {
    const t = this.type();
    return (t && THEMES[t]) || FALLBACK;
  });

  /** ±18° hue jitter + a small angle wobble derived from the seed hash. */
  readonly gradient = computed(() => {
    const { from, to } = this.theme();
    const h = hash(this.seed() || this.type() || '');
    const shift = ((h % 37) - 18); // roughly -18..+18 deg
    const angle = 120 + (h % 60); // 120..179 deg
    return `linear-gradient(${angle}deg, ${hueShift(from, shift)}, ${hueShift(to, shift)})`;
  });

  readonly glyph = computed(() => this.theme().glyph);
}
