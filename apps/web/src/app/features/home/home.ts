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
    const isEn = this.locale.locale() === 'en';
    const seg = isEn ? '/en/waters' : '/vodoymy';
    const goLabel = isEn ? 'Open' : 'Перейти';
    const icon = L.divIcon({
      className: 'fish-pin',
      html: '<span class="fish-pin__dot"></span><span class="fish-pin__pulse"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const bounds: [number, number][] = [];
    for (const p of pinList) {
      const marker = L.marker([p.lat, p.lng], { icon });
      const detailUrl = `${seg}/${p.regionSlug}/${p.slug}`;
      marker.bindPopup(`<strong>${p.name}</strong><br><a href="${detailUrl}">→ ${goLabel}</a>`);
      marker.addTo(this.leafletMap);
      bounds.push([p.lat, p.lng]);
    }
    const boundsObj = L.latLngBounds(bounds);
    if (boundsObj.isValid()) {
      this.leafletMap.fitBounds(boundsObj.pad(0.2), { maxZoom: 7 });
    }
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
