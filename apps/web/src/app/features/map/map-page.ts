import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MapPinDto } from '@fishing/shared';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { usePageLocale } from '../../core/use-locale';
import { Header } from '../../layout/header';

@Component({
  selector: 'app-map-page',
  imports: [Header, TranslocoPipe, FormsModule],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly pair = this.locale.pathPair('map');
  readonly regions = toSignal(this.api.regions(), { initialValue: [] });
  readonly fishList = toSignal(this.api.fishSpecies(), { initialValue: [] });
  readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');

  region = '';
  fish = '';
  paid = '';

  private map: any = null;
  private cluster: any = null;
  private L: any = null;

  constructor() {
    const uk = this.locale.locale() === 'uk';
    this.seo.apply({
      title: uk ? 'Карта водойм України — FishMap.ua' : 'Fishing waters map — FishMap.ua',
      description: uk ? 'Усі водойми каталогу на одній карті.' : 'All catalog waters on one map.',
      paths: this.pair,
      locale: this.locale.locale(),
    });

    afterNextRender(async () => {
      const leaflet = await import('leaflet');
      const L = (leaflet as any).default ?? leaflet;
      this.L = L;
      await import('leaflet.markercluster');

      this.map = L.map(this.mapEl().nativeElement).setView([49.0, 31.0], 6);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(this.map);
      await this.refresh();
    });
  }

  async refresh() {
    if (!this.L || !this.map) return;
    const pins = await firstValueFrom(
      this.api.mapPins({
        region: this.region || undefined,
        fish: this.fish ? [this.fish] : undefined,
        paid: (this.paid as 'true' | 'false') || undefined,
      }),
    );
    if (this.cluster) {
      this.cluster.remove();
    }
    this.cluster = (this.L as any).markerClusterGroup();
    for (const p of pins) {
      const m = this.L.marker([p.lat, p.lng]);
      m.bindPopup(this.popupHtml(p));
      this.cluster.addLayer(m);
    }
    this.map.addLayer(this.cluster);
  }

  private popupHtml(p: MapPinDto): string {
    const isEn = this.locale.locale() === 'en';
    const seg = isEn ? '/en/waters' : '/vodoymy';
    const priceLabel = p.isPaid
      ? (isEn ? '₴ paid' : '₴ платна')
      : (isEn ? 'free' : 'безкоштовно');
    return `<strong>${p.name}</strong><br>${priceLabel}<br><a href="${seg}/${p.regionSlug}/${p.slug}">→ ${p.name}</a>`;
  }
}
