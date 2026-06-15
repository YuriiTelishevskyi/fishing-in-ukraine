import { ChangeDetectionStrategy, Component, afterNextRender, inject, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { NearbyWaterDto } from '@fishing/shared';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { WaterCard } from '../../shared/water-card';

@Component({
  selector: 'app-nearby',
  imports: [Header, Footer, TranslocoPipe, RouterLink, WaterCard],
  templateUrl: './nearby.html',
  styleUrl: './nearby.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NearbyPage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly pair = this.locale.pathPair('nearby');
  readonly status = signal<'locating' | 'ready' | 'empty' | 'denied'>('locating');
  readonly waters = signal<NearbyWaterDto[]>([]);

  constructor() {
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex' });

    const isEn = this.locale.locale() === 'en';
    this.seo.apply({
      title: isEn ? 'Fishing spots near you — FishMap.ua' : 'Риболовні місця поруч — FishMap.ua',
      description: isEn
        ? 'Find fishing waters near your current location in Ukraine.'
        : 'Знайдіть водойми поблизу вашого місцезнаходження в Україні.',
      paths: this.pair,
      locale: this.locale.locale(),
    });

    afterNextRender(() => this.locate());
  }

  retry() {
    this.status.set('locating');
    this.locate();
  }

  private locate() {
    if (!navigator.geolocation) {
      this.status.set('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.api.watersNearby(pos.coords.latitude, pos.coords.longitude).subscribe({
          next: (ws) => {
            this.waters.set(ws);
            this.status.set(ws.length ? 'ready' : 'empty');
          },
          error: () => this.status.set('denied'),
        });
      },
      () => this.status.set('denied'),
    );
  }
}
