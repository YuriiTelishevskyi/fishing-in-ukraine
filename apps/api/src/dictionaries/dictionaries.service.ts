import { Injectable } from '@nestjs/common';
import { AmenityDto, FishSpeciesDto, Locale, RegionDto } from '@fishing/shared';
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
