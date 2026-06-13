import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SpotDto } from '@fishing/shared';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../media/storage.service';
import { CreateSpotDto } from './dto/create-spot.dto';
import { AdminSpotsQueryDto } from './dto/admin-spots-query.dto';
import { toSpotDto } from './spots.mapper';
import { SpotStatus } from '@prisma/client';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const SIZES = [
  { suffix: 'thumb', width: 320 },
  { suffix: 'card', width: 640 },
  { suffix: 'full', width: 1600 },
] as const;

@Injectable()
export class SpotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ── Public ──────────────────────────────────────────────────────────────────

  async listApproved(): Promise<SpotDto[]> {
    const rows = await this.prisma.spot.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    return rows.map(toSpotDto);
  }

  async create(dto: CreateSpotDto, file?: Express.Multer.File): Promise<{ ok: true }> {
    // Honeypot check
    if (dto.website && dto.website.trim().length > 0) {
      throw new BadRequestException('Spam detected');
    }

    // BBox guard: Ukraine bounds
    if (dto.lat < 44 || dto.lat > 53 || dto.lng < 22 || dto.lng > 41) {
      throw new BadRequestException('Координати поза межами України');
    }

    let photoUrl: string | undefined;
    const id = randomUUID();

    if (file) {
      if (!ALLOWED_MIME.includes(file.mimetype)) {
        throw new BadRequestException('Непідтримуваний формат файлу');
      }

      try {
        for (const { suffix, width } of SIZES) {
          const buf = await sharp(file.buffer)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          await this.storage.save(`spots/${id}/${id}-${suffix}.webp`, buf);
        }
      } catch {
        for (const { suffix } of SIZES) {
          await this.storage.delete(`spots/${id}/${id}-${suffix}.webp`);
        }
        throw new BadRequestException('Не вдалося обробити зображення');
      }

      photoUrl = `/uploads/spots/${id}/${id}-full.webp`;
    }

    await this.prisma.spot.create({
      data: {
        id,
        lat: dto.lat,
        lng: dto.lng,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        title: dto.title,
        comment: dto.comment,
        fishNote: dto.fishNote,
        photoUrl,
        status: 'PENDING',
      },
    });

    return { ok: true };
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  async adminList(q: AdminSpotsQueryDto) {
    const where = { status: q.status as SpotStatus };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.spot.count({ where }),
      this.prisma.spot.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return {
      items: rows,
      total,
      page: q.page,
      perPage: q.perPage,
    };
  }

  async moderate(id: string, status: SpotStatus): Promise<void> {
    await this.prisma.spot.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string): Promise<void> {
    const spot = await this.prisma.spot.findUnique({ where: { id } });
    if (!spot) throw new NotFoundException(`Spot "${id}" not found`);
    await this.prisma.spot.delete({ where: { id } });
    await this.storage.deleteDir(`spots/${id}`);
  }
}
