import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { NearbyWaterDto, WaterListItemDto } from '@fishing/shared';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { SITE_ORIGIN } from '../../core/site-origin';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { RevealDirective } from '../../shared/reveal.directive';
import { WaterCard } from '../../shared/water-card';
import { CountUpDirective } from '../../shared/count-up.directive';
import { createRegionBubble } from '../../shared/map-pin';

@Component({
  selector: 'app-home',
  imports: [Header, Footer, TranslocoPipe, WaterCard, RevealDirective, RouterLink, FormsModule, CountUpDirective],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly siteOrigin = inject(SITE_ORIGIN);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  readonly pair = this.locale.pathPair('home');
  readonly regions = toSignal(this.api.regions(), { initialValue: [] });
  readonly fish = toSignal(this.api.fishSpecies(), { initialValue: [] });
  // Recommended row. SSR + initial render show a varied fallback set (distinct
  // regions); the browser may upgrade this to geolocated «nearby» waters.
  readonly featured = signal<(WaterListItemDto & { distanceKm?: number })[]>([]);
  // Heading is DERIVED from the same `featured` signal (so it can never diverge
  // from the cards): geolocated rows carry `distanceKm` → «Near you».
  readonly geolocated = signal(false);
  readonly recHeading = computed<'home.recommended' | 'home.recommendedNear'>(() =>
    this.geolocated() ? 'home.recommendedNear' : 'home.recommended',
  );
  readonly pins = toSignal(this.api.mapPins(), { initialValue: [] });
  readonly homeMapEl = viewChild<ElementRef<HTMLDivElement>>('homeMap');

  searchRegion = '';
  searchFish = '';

  private leafletMap: any = null;
  private leafletL: any = null;
  private markersAdded = false;
  private mapMounted = false;

  constructor() {
    const uk = this.locale.locale() === 'uk';
    this.seo.apply({
      title: uk
        ? 'FishMap.ua — каталог водойм України для риболовлі'
        : 'FishMap.ua — Ukrainian fishing waters catalog',
      description: uk
        ? 'Знайди озеро, став чи річку для риболовлі: ціни, види риби, зручності, карта. Уся Україна.'
        : 'Find a lake, pond or river for fishing in Ukraine: prices, fish species, amenities, map.',
      paths: this.pair,
      locale: this.locale.locale(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'FishMap.ua',
          url: `${this.siteOrigin}/`,
        },
      ],
    });

    // Recommended row: fetch a larger page and pick up to 6 waters from
    // DISTINCT regions so the fallback isn't all one oblast. Runs on SSR + the
    // browser so there's content immediately (no blank section / layout shift).
    this.api
      .waters({ perPage: 40 })
      .pipe(takeUntilDestroyed())
      .subscribe((res) => {
        // Only seed the fallback if geolocation hasn't already populated the row.
        if (!this.geolocated()) {
          this.featured.set(this.pickVaried(res.items, 6));
        }
      });

    // Browser-only: try the visitor's location once to recommend NEARBY waters.
    // On success we replace the fallback with the nearest waters + a «Near you»
    // heading. On denial / no-geo / timeout we silently keep the varied set.
    if (this.isBrowser) {
      afterNextRender(() => this.tryGeolocate(), { injector: this.injector });
    }

    // Mount Leaflet map once in the browser — follow the exact same
    // SSR-safe pattern used by water-detail.ts:
    // Set the guard flag BEFORE scheduling afterNextRender so the effect
    // never re-enters. Pass {injector} because we're inside an effect.
    // We trigger on regions() arriving (non-empty) as a reliable signal
    // that the page is fully hydrated and data is ready.
    effect(() => {
      const regions = this.regions();
      if (!this.isBrowser || this.mapMounted || regions.length === 0) return;
      this.mapMounted = true;
      afterNextRender(() => this.mountMap(), { injector: this.injector });
    });

    // Effect: add markers once map is ready and pins have loaded.
    // Direct call — no afterNextRender needed; markers are added to already-mounted map.
    effect(() => {
      const pinList = this.pins();
      if (!this.isBrowser || !this.leafletMap || this.markersAdded || pinList.length === 0) return;
      this.markersAdded = true;
      this.addMarkers(pinList, this.leafletL);
    });
  }

  /** Pick up to `limit` waters from DISTINCT regions (dedupe by regionSlug). */
  private pickVaried(items: WaterListItemDto[], limit: number): WaterListItemDto[] {
    const seen = new Set<string>();
    const picked: WaterListItemDto[] = [];
    for (const w of items) {
      if (seen.has(w.regionSlug)) continue;
      seen.add(w.regionSlug);
      picked.push(w);
      if (picked.length >= limit) break;
    }
    // If fewer distinct regions than `limit`, top up with remaining items.
    if (picked.length < limit) {
      for (const w of items) {
        if (picked.includes(w)) continue;
        picked.push(w);
        if (picked.length >= limit) break;
      }
    }
    return picked;
  }

  /** Browser-only: a single getCurrentPosition; on success → nearby waters. */
  private tryGeolocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    // The geolocation callback can fire OUTSIDE Angular's zone, so signal
    // writes there wouldn't schedule change detection. Re-enter the zone before
    // kicking off the request so the resulting signal updates render.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.zone.run(() => {
          this.api
            .watersNearby(pos.coords.latitude, pos.coords.longitude, 200, 6)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (ws: NearbyWaterDto[]) => {
                if (ws.length) {
                  this.featured.set(ws);
                  this.geolocated.set(true);
                }
                // Empty result → keep the existing varied fallback + heading.
              },
              // Network error → keep the varied fallback.
              error: () => {},
            });
        });
      },
      // Denied / unavailable / timeout → keep the varied fallback.
      () => {},
      { timeout: 8000, maximumAge: 600_000 },
    );
  }

  private async mountMap() {
    const el = this.homeMapEl()?.nativeElement;
    if (!el) return;
    const leaflet = await import('leaflet');
    const L = (leaflet as any).default ?? leaflet;
    this.leafletL = L;

    this.leafletMap = L.map(el, {
      // Teaser: don't hijack page scroll with wheel zoom, but keep pinch zoom.
      scrollWheelZoom: false,
      touchZoom: true,
      zoomControl: true,
      attributionControl: true,
    }).setView([48.6, 31.2], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(this.leafletMap);

    // Spotlight Ukraine (teal border + dim mask), non-interactive, below markers.
    this.addUkraineHighlight(L);

    // If pins arrived before map was ready, add them now
    const currentPins = this.pins();
    if (currentPins.length > 0 && !this.markersAdded) {
      this.markersAdded = true;
      this.addMarkers(currentPins, L);
    }
  }

  /**
   * Fetch the simplified Ukraine boundary and render a teal border + a dim mask
   * (world polygon with Ukraine as a hole) below the markers. Non-interactive so
   * region-bubble clicks pass through. Decorative — failures are ignored.
   */
  private async addUkraineHighlight(L: any) {
    if (!this.leafletMap) return;
    try {
      const res = await fetch('/geo/ukraine.geojson');
      if (!res.ok) return;
      const geo = await res.json();

      const worldRing: [number, number][] = [
        [-90, -180],
        [90, -180],
        [90, 180],
        [-90, 180],
      ];
      const holes = this.extractRings(geo).map((ring) =>
        ring.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
      );
      L.polygon([worldRing, ...holes], {
        stroke: false,
        fillColor: '#04222C',
        fillOpacity: 0.28,
        interactive: false,
      }).addTo(this.leafletMap);

      L.geoJSON(geo, {
        style: { color: '#0E7490', weight: 2, opacity: 0.9, fill: false },
        interactive: false,
      }).addTo(this.leafletMap);
    } catch {
      // ignore — highlight is decorative
    }
  }

  private extractRings(geo: any): [number, number][][] {
    const rings: [number, number][][] = [];
    const features = geo?.type === 'FeatureCollection' ? geo.features : [geo];
    for (const f of features ?? []) {
      const g = f?.geometry ?? f;
      if (!g) continue;
      if (g.type === 'Polygon') {
        if (g.coordinates?.[0]) rings.push(g.coordinates[0]);
      } else if (g.type === 'MultiPolygon') {
        for (const poly of g.coordinates ?? []) {
          if (poly?.[0]) rings.push(poly[0]);
        }
      }
    }
    return rings;
  }

  private addMarkers(pinList: any[], L: any) {
    if (!this.leafletMap || !L) return;
    // The home map is a Ukraine-scale teaser, so we always render one region
    // bubble per oblast (count of waters) instead of individual pins. Clicking
    // a bubble navigates to that region's catalog.
    const regionNames = new Map(this.regions().map((r) => [r.slug, r.name]));
    const groups = this.groupByRegion(pinList, regionNames);
    const bounds: [number, number][] = [];
    for (const g of groups) {
      const marker = L.marker([g.lat, g.lng], { icon: createRegionBubble(L, g.count) });
      marker.bindTooltip(`${g.name} (${g.count})`, { direction: 'top', offset: [0, -8] });
      marker.on('click', () => {
        this.router.navigate([this.locale.link('catalog', g.slug)]);
      });
      marker.addTo(this.leafletMap);
      bounds.push([g.lat, g.lng]);
    }
    const boundsObj = L.latLngBounds(bounds);
    if (boundsObj.isValid()) {
      this.leafletMap.fitBounds(boundsObj.pad(0.2), { maxZoom: 7 });
    }
  }

  private groupByRegion(
    pins: any[],
    names: Map<string, string>,
  ): { slug: string; name: string; count: number; lat: number; lng: number }[] {
    const acc = new Map<string, { count: number; latSum: number; lngSum: number }>();
    for (const p of pins) {
      const cur = acc.get(p.regionSlug) ?? { count: 0, latSum: 0, lngSum: 0 };
      cur.count += 1;
      cur.latSum += p.lat;
      cur.lngSum += p.lng;
      acc.set(p.regionSlug, cur);
    }
    return Array.from(acc, ([slug, v]) => ({
      slug,
      name: names.get(slug) ?? slug,
      count: v.count,
      lat: v.latSum / v.count,
      lng: v.lngSum / v.count,
    }));
  }

  search() {
    const params: Record<string, string> = {};
    if (this.searchFish) params['fish'] = this.searchFish;
    const path = this.searchRegion
      ? this.locale.link('catalog', this.searchRegion)
      : this.locale.link('catalog');
    this.router.navigate([path], { queryParams: params });
  }
}
