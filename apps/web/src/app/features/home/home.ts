import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
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

  readonly pair = this.locale.pathPair('home');
  readonly regions = toSignal(this.api.regions(), { initialValue: [] });
  readonly fish = toSignal(this.api.fishSpecies(), { initialValue: [] });
  readonly featured = toSignal(this.api.waters({ perPage: 6 }), { initialValue: null });
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

  private async mountMap() {
    const el = this.homeMapEl()?.nativeElement;
    if (!el) return;
    const leaflet = await import('leaflet');
    const L = (leaflet as any).default ?? leaflet;
    this.leafletL = L;

    this.leafletMap = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    }).setView([48.6, 31.2], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(this.leafletMap);

    // If pins arrived before map was ready, add them now
    const currentPins = this.pins();
    if (currentPins.length > 0 && !this.markersAdded) {
      this.markersAdded = true;
      this.addMarkers(currentPins, L);
    }
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
