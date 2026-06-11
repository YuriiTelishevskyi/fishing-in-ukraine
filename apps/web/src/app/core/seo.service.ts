import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoPage {
  title: string;
  description: string;
  /** absolute-path pair for hreflang + canonical, e.g. {uk:'/vodoymy', en:'/en/waters'} */
  paths: { uk: string; en: string };
  locale: 'uk' | 'en';
  image?: string | null;
  jsonLd?: object[];
}

const ORIGIN = 'https://fishmap.ua'; // replaced by real domain at deploy; relative canonical is invalid

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  apply(p: SeoPage) {
    this.title.setTitle(p.title);
    this.meta.updateTag({ name: 'description', content: p.description });
    this.meta.updateTag({ property: 'og:title', content: p.title });
    this.meta.updateTag({ property: 'og:description', content: p.description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    const canonical = ORIGIN + (p.locale === 'en' ? p.paths.en : p.paths.uk);
    this.meta.updateTag({ property: 'og:url', content: canonical });
    if (p.image) this.meta.updateTag({ property: 'og:image', content: ORIGIN + p.image });
    else this.meta.removeTag("property='og:image'");

    this.setLink('canonical', canonical);
    this.setLink('alternate', ORIGIN + p.paths.uk, 'uk');
    this.setLink('alternate', ORIGIN + p.paths.en, 'en');
    this.setLink('alternate', ORIGIN + p.paths.uk, 'x-default');

    this.setJsonLd(p.jsonLd ?? []);
  }

  private setLink(rel: string, href: string, hreflang?: string) {
    const sel = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
    let el = this.doc.head.querySelector<HTMLLinkElement>(sel);
    if (!el) {
      el = this.doc.createElement('link');
      el.rel = rel;
      if (hreflang) el.hreflang = hreflang;
      this.doc.head.appendChild(el);
    }
    el.href = href;
  }

  private setJsonLd(blocks: object[]) {
    this.doc.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
    for (const block of blocks) {
      const s = this.doc.createElement('script');
      s.type = 'application/ld+json';
      s.text = JSON.stringify(block);
      this.doc.head.appendChild(s);
    }
  }
}
