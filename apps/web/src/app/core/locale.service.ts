import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Locale } from '@fishing/shared';

const SEGMENTS: Record<string, { uk: string; en: string }> = {
  catalog: { uk: 'vodoymy', en: 'waters' },
  fish: { uk: 'ryba', en: 'fish' },
  map: { uk: 'karta', en: 'map' },
  blog: { uk: 'blog', en: 'blog' },
  biteCalendar: { uk: 'kalendar-klyovu', en: 'bite-calendar' },
  nearby: { uk: 'poruch', en: 'nearby' },
};

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);

  readonly locale = signal<Locale>('uk');

  set(locale: Locale) {
    this.locale.set(locale);
    this.transloco.setActiveLang(locale);
    this.doc.documentElement.lang = locale;
  }

  /** '' for uk, '/en' for en */
  get prefix(): string {
    return this.locale() === 'en' ? '/en' : '';
  }

  link(kind: keyof typeof SEGMENTS, ...slugs: string[]): string {
    const seg = SEGMENTS[kind][this.locale()];
    return [this.prefix, seg, ...slugs].join('/').replace(/\/+/g, '/') || '/';
  }

  home(): string {
    return this.prefix || '/';
  }

  /** uk/en path pair for the CURRENT page — used for hreflang + the lang switcher. */
  pathPair(kind: keyof typeof SEGMENTS | 'home', slugs: string[] = []): { uk: string; en: string } {
    if (kind === 'home') return { uk: '/', en: '/en' };
    const tail = slugs.length ? '/' + slugs.join('/') : '';
    return {
      uk: `/${SEGMENTS[kind].uk}${tail}`,
      en: `/en/${SEGMENTS[kind].en}${tail}`,
    };
  }
}
