import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Paginated, WaterDetailDto } from '@fishing/shared';
import { Prisma } from '@prisma/client';
import { slugify } from '../common/slugify';
import { PrismaService } from '../prisma/prisma.service';
import { AdminWatersQueryDto } from './dto/admin-waters-query.dto';
import { CreateWaterDto } from './dto/create-water.dto';
import { UpdateWaterDto } from './dto/update-water.dto';
import { FULL_INCLUDE, toDetail } from './waters.mapper';

@Injectable()
export class AdminWatersService {
  constructor(private readonly prisma: PrismaService) {}

  private assertPriceRange(priceFrom?: number | null, priceTo?: number | null) {
    if (priceFrom != null && priceTo != null && priceTo < priceFrom) {
      throw new BadRequestException('priceTo must be greater than or equal to priceFrom');
    }
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'vodoyma';
    let slug = base;
    for (let i = 2; await this.prisma.water.findUnique({ where: { slug } }); i++) {
      slug = `${base}-${i}`;
    }
    return slug;
  }

  async list(q: AdminWatersQueryDto): Promise<Paginated<WaterDetailDto>> {
    const and: Prisma.WaterWhereInput[] = [];
    if (q.status) and.push({ status: q.status });
    if (q.region) and.push({ region: { slug: q.region } });
    if (q.search) and.push({ name: { contains: q.search, mode: 'insensitive' } });
    const where: Prisma.WaterWhereInput = { AND: and };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.water.count({ where }),
      this.prisma.water.findMany({
        where,
        include: FULL_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return {
      items: rows.map((w) => toDetail(w, 'uk')),
      total,
      page: q.page,
      perPage: q.perPage,
    };
  }

  async byId(id: string): Promise<WaterDetailDto> {
    const water = await this.prisma.water.findUnique({ where: { id }, include: FULL_INCLUDE });
    if (!water) throw new NotFoundException(`Water ${id} not found`);
    return toDetail(water, 'uk');
  }

  async create(dto: CreateWaterDto): Promise<WaterDetailDto> {
    const { fishIds = [], amenityIds = [], ...data } = dto;
    this.assertPriceRange(dto.priceFrom, dto.priceTo);
    const water = await this.prisma.water.create({
      data: {
        ...data,
        slug: await this.uniqueSlug(dto.name),
        fish: { create: fishIds.map((fishId) => ({ fishId })) },
        amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
      },
      include: FULL_INCLUDE,
    });
    return toDetail(water, 'uk');
  }

  async update(id: string, dto: UpdateWaterDto): Promise<WaterDetailDto> {
    const current = await this.byId(id);
    const { fishIds, amenityIds, ...data } = dto;
    this.assertPriceRange(dto.priceFrom ?? current.priceFrom, dto.priceTo ?? current.priceTo);
    const water = await this.prisma.$transaction(async (tx) => {
      if (fishIds) {
        await tx.waterFish.deleteMany({ where: { waterId: id } });
        await tx.waterFish.createMany({ data: fishIds.map((fishId) => ({ waterId: id, fishId })) });
      }
      if (amenityIds) {
        await tx.waterAmenity.deleteMany({ where: { waterId: id } });
        await tx.waterAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ waterId: id, amenityId })),
        });
      }
      return tx.water.update({ where: { id }, data, include: FULL_INCLUDE });
    });
    return toDetail(water, 'uk');
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.byId(id);
    await this.prisma.water.delete({ where: { id } });
    return { ok: true };
  }
}
