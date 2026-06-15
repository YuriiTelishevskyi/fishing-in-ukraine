import { Injectable, NotFoundException } from '@nestjs/common';
import { AmenityDto, FishRegionCountDto, FishSpeciesDto, Locale, RegionDto } from '@fishing/shared';
import { PrismaService } from '../prisma/prisma.service';

const loc = (lang: Locale, uk: string, en: string) => (lang === 'en' && en ? en : uk);

@Injectable()
export class DictionariesService {
  constructor(private readonly prisma: PrismaService) {}

  async regions(lang: Locale): Promise<RegionDto[]> {
    const rows = await this.prisma.region.findMany({ orderBy: lang === 'en' ? { nameEn: 'asc' as const } : { name: 'asc' as const } });
    return rows.map((r) => ({ id: r.id, slug: r.slug, name: loc(lang, r.name, r.nameEn) }));
  }

  async fishSpecies(lang: Locale): Promise<FishSpeciesDto[]> {
    const rows = await this.prisma.fishSpecies.findMany({ orderBy: lang === 'en' ? { nameEn: 'asc' as const } : { name: 'asc' as const } });
    return rows.map((f) => ({ id: f.id, slug: f.slug, name: loc(lang, f.name, f.nameEn) }));
  }

  async fishSpeciesRegions(slug: string, lang: Locale): Promise<FishRegionCountDto[]> {
    const fish = await this.prisma.fishSpecies.findUnique({ where: { slug }, select: { id: true } });
    if (!fish) throw new NotFoundException(`Fish "${slug}" not found`);
    const rows = await this.prisma.water.findMany({
      where: { status: 'PUBLISHED', fish: { some: { fishId: fish.id } } },
      select: { region: { select: { slug: true, name: true, nameEn: true } } },
    });
    const map = new Map<string, { name: string; nameEn: string; count: number }>();
    for (const w of rows) {
      const r = w.region;
      const e = map.get(r.slug) ?? { name: r.name, nameEn: r.nameEn, count: 0 };
      e.count++;
      map.set(r.slug, e);
    }
    return [...map.entries()]
      .map(([regionSlug, e]) => ({ regionSlug, regionName: loc(lang, e.name, e.nameEn), count: e.count }))
      .sort((a, b) => b.count - a.count);
  }

  async amenities(lang: Locale): Promise<AmenityDto[]> {
    const rows = await this.prisma.amenity.findMany({ orderBy: lang === 'en' ? { nameEn: 'asc' as const } : { name: 'asc' as const } });
    return rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: loc(lang, a.name, a.nameEn),
      icon: a.icon,
    }));
  }
}
