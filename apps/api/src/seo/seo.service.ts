import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/** A logical page in both locales; en pages live under /en with English segments. */
interface PagePair {
  uk: string;
  en: string;
  lastmod?: string;
}

@Injectable()
export class SeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sitemap(): Promise<string> {
    const base = (this.config.get<string>('SITE_BASE_URL') ?? 'http://localhost:4200').replace(
      /\/$/,
      '',
    );

    const [regions, waters, fish, articles, fishRegionRows] = await Promise.all([
      this.prisma.region.findMany({ select: { slug: true } }),
      this.prisma.water.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true, region: { select: { slug: true } } },
      }),
      this.prisma.fishSpecies.findMany({
        where: { waters: { some: { water: { status: 'PUBLISHED' } } } },
        select: { slug: true },
      }),
      this.prisma.article.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.waterFish.findMany({
        where: { water: { status: 'PUBLISHED' } },
        select: { fish: { select: { slug: true } }, water: { select: { region: { select: { slug: true } } } } },
      }),
    ]);

    const seen = new Set<string>();
    const fishRegionCombos: { fish: string; region: string }[] = [];
    for (const wf of fishRegionRows) {
      const f = wf.fish.slug;
      const r = wf.water.region.slug;
      const key = `${f}|${r}`;
      if (!seen.has(key)) {
        seen.add(key);
        fishRegionCombos.push({ fish: f, region: r });
      }
    }

    const pages: PagePair[] = [
      { uk: '/', en: '/en' },
      { uk: '/vodoymy', en: '/en/waters' },
      { uk: '/karta', en: '/en/map' },
      { uk: '/blog', en: '/en/blog' },
      { uk: '/kalendar-klyovu', en: '/en/bite-calendar' },
      ...regions.map((r) => ({ uk: `/vodoymy/${r.slug}`, en: `/en/waters/${r.slug}` })),
      ...waters.map((w) => ({
        uk: `/vodoymy/${w.region.slug}/${w.slug}`,
        en: `/en/waters/${w.region.slug}/${w.slug}`,
        lastmod: w.updatedAt.toISOString().slice(0, 10),
      })),
      ...fish.map((f) => ({ uk: `/ryba/${f.slug}`, en: `/en/fish/${f.slug}` })),
      ...fishRegionCombos.map((c) => ({ uk: `/ryba/${c.fish}/${c.region}`, en: `/en/fish/${c.fish}/${c.region}` })),
      ...articles.map((a) => ({
        uk: `/blog/${a.slug}`,
        en: `/en/blog/${a.slug}`,
        lastmod: a.updatedAt.toISOString().slice(0, 10),
      })),
    ];

    const alternates = (p: PagePair) =>
      `<xhtml:link rel="alternate" hreflang="uk" href="${base}${p.uk}"/>` +
      `<xhtml:link rel="alternate" hreflang="en" href="${base}${p.en}"/>` +
      `<xhtml:link rel="alternate" hreflang="x-default" href="${base}${p.uk}"/>`;

    const body = pages
      .flatMap((p) =>
        (['uk', 'en'] as const).map((l) => {
          const lastmod = p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : '';
          return `  <url><loc>${base}${p[l]}</loc>${lastmod}${alternates(p)}</url>`;
        }),
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
  }
}
