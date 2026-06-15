import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Locale, MapPinDto, NearbyWaterDto, Paginated, WaterDetailDto, WaterListItemDto } from '@fishing/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { haversineKm } from '../common/haversine';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { WatersQueryDto } from './dto/waters-query.dto';
import { FULL_INCLUDE, LIST_INCLUDE, toDetail, toListItem, toPin } from './waters.mapper';

@Injectable()
export class WatersService {
  private readonly logger = new Logger(WatersService.name);

  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(q: WatersQueryDto): Prisma.WaterWhereInput {
    const and: Prisma.WaterWhereInput[] = [{ status: 'PUBLISHED' }];

    if (q.region) and.push({ region: { slug: q.region } });
    if (q.river) and.push({ river: { slug: q.river } });
    if (q.type) and.push({ waterType: q.type });
    if (q.paid !== undefined) and.push({ isPaid: q.paid === 'true' });
    // TODO: also search nameEn when lang === 'en'
    if (q.search) and.push({ name: { contains: q.search, mode: 'insensitive' } });

    if (q.fish) {
      const slugs = q.fish.split(',').filter(Boolean);
      if (slugs.length) and.push({ fish: { some: { fish: { slug: { in: slugs } } } } });
    }
    if (q.amenities) {
      for (const slug of q.amenities.split(',').filter(Boolean)) {
        and.push({ amenities: { some: { amenity: { slug } } } });
      }
    }
    return { AND: and };
  }

  async list(q: WatersQueryDto): Promise<Paginated<WaterListItemDto>> {
    const where = this.buildWhere(q);
    const orderBy: Prisma.WaterOrderByWithRelationInput[] =
      q.sort === 'popular'
        ? [{ isPremium: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }]
        : [{ isPremium: 'desc' }, { verified: 'desc' }, { createdAt: 'desc' }];
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.water.count({ where }),
      this.prisma.water.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy,
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return {
      items: rows.map((w) => toListItem(w, q.lang)),
      total,
      page: q.page,
      perPage: q.perPage,
    };
  }

  async mapPins(q: WatersQueryDto): Promise<MapPinDto[]> {
    const rows = await this.prisma.water.findMany({
      where: this.buildWhere(q),
      select: {
        id: true,
        slug: true,
        name: true,
        nameEn: true,
        lat: true,
        lng: true,
        isPaid: true,
        isPremium: true,
        premiumUntil: true,
        region: { select: { slug: true } },
      },
      take: 2000,
    });
    return rows.map((w) => toPin(w, q.lang));
  }

  async nearby(q: NearbyQueryDto): Promise<NearbyWaterDto[]> {
    const rows = await this.prisma.water.findMany({
      where: { status: 'PUBLISHED' },
      include: LIST_INCLUDE,
    });
    return rows
      .map((w) => ({
        ...toListItem(w, q.lang),
        distanceKm: Math.round(haversineKm(q.lat, q.lng, w.lat, w.lng) * 10) / 10,
      }))
      .filter((w) => w.distanceKm <= q.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, q.limit);
  }

  async bySlug(slug: string, lang: Locale): Promise<WaterDetailDto> {
    const water = await this.prisma.water.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: FULL_INCLUDE,
    });
    if (!water) throw new NotFoundException(`Water "${slug}" not found`);
    void this.prisma.water.update({ where: { id: water.id }, data: { viewCount: { increment: 1 } } }).catch((err) => this.logger.warn('viewCount increment failed', err));
    return toDetail(water, lang);
  }
}
