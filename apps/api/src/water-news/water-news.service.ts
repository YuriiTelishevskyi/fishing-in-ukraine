import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWaterNewsDto } from './dto/create-water-news.dto';
import { UpdateWaterNewsDto } from './dto/update-water-news.dto';
import { AdminWaterNewsQueryDto } from './dto/admin-water-news-query.dto';
import { toWaterNewsDto } from './water-news.mapper';
import { WaterNewsDto } from '@fishing/shared';

@Injectable()
export class WaterNewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForWater(slug: string, lang: string): Promise<WaterNewsDto[]> {
    const water = await this.prisma.water.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!water) throw new NotFoundException('Water not found');

    const rows = await this.prisma.waterNews.findMany({
      where: { waterId: water.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });

    return rows.map((r) => toWaterNewsDto(r, lang));
  }

  async adminList(q: AdminWaterNewsQueryDto) {
    const where = q.waterId ? { waterId: q.waterId } : {};
    const page = q.page ?? 1;
    const perPage = q.perPage ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.waterNews.findMany({
        where,
        orderBy: [{ date: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
        include: { water: { select: { slug: true, name: true } } },
      }),
      this.prisma.waterNews.count({ where }),
    ]);

    return { items, total, page, perPage };
  }

  async byId(id: string) {
    const item = await this.prisma.waterNews.findUnique({
      where: { id },
      include: { water: { select: { slug: true, name: true } } },
    });
    if (!item) throw new NotFoundException('Water news not found');
    return item;
  }

  async create(dto: CreateWaterNewsDto) {
    const water = await this.prisma.water.findUnique({ where: { id: dto.waterId } });
    if (!water) throw new NotFoundException('Water not found');

    return this.prisma.waterNews.create({
      data: {
        ...dto,
        date: new Date(`${dto.date}T00:00:00.000Z`),
      },
    });
  }

  async update(id: string, dto: UpdateWaterNewsDto) {
    await this.byId(id);
    const data: any = { ...dto };
    if (dto.date) {
      data.date = new Date(`${dto.date}T00:00:00.000Z`);
    }
    return this.prisma.waterNews.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.byId(id);
    return this.prisma.waterNews.delete({ where: { id } });
  }
}
