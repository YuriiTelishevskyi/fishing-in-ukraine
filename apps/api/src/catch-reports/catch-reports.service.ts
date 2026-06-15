import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatchReportDto, Locale, Paginated } from '@fishing/shared';
import { CatchReportStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../media/storage.service';
import { CreateCatchReportDto } from './dto/create-catch-report.dto';
import { AdminCatchReportsQueryDto } from './dto/admin-catch-reports-query.dto';
import { toCatchReportDto } from './catch-reports.mapper';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const SIZES = [
  { suffix: 'thumb', width: 320 },
  { suffix: 'card', width: 640 },
  { suffix: 'full', width: 1600 },
] as const;
const PER_PAGE = 8;

@Injectable()
export class CatchReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ── Public ──────────────────────────────────────────────────────────────
  async listApproved(slug: string, page: number, lang: Locale): Promise<Paginated<CatchReportDto>> {
    const water = await this.prisma.water.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!water) throw new NotFoundException(`Water "${slug}" not found`);

    const where = { waterId: water.id, status: 'APPROVED' as CatchReportStatus };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.catchReport.count({ where }),
      this.prisma.catchReport.findMany({
        where,
        include: { fish: true },
        orderBy: [{ caughtAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
    ]);
    return { items: rows.map((r) => toCatchReportDto(r, lang)), total, page, perPage: PER_PAGE };
  }

  async create(slug: string, dto: CreateCatchReportDto, file?: Express.Multer.File): Promise<{ ok: true }> {
    if (dto.website && dto.website.trim().length > 0) throw new BadRequestException('Spam detected');

    const water = await this.prisma.water.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!water) throw new NotFoundException(`Water "${slug}" not found`);

    const fish = await this.prisma.fishSpecies.findUnique({ where: { id: dto.fishId }, select: { id: true } });
    if (!fish) throw new BadRequestException('Невідомий вид риби');

    // caughtAt is DTO-restricted to yyyy-mm-dd; build a UTC-midnight instant so the
    // @db.Date column and the mapper's toISOString().slice(0,10) round-trip stay stable.
    const caught = new Date(`${dto.caughtAt}T00:00:00.000Z`);
    if (Number.isNaN(caught.getTime())) throw new BadRequestException('Невірна дата вилову');
    // Compare at calendar-date granularity (UTC, lexicographic on yyyy-mm-dd). Allow up to
    // "tomorrow UTC" so a catch logged late in a timezone ahead of UTC isn't wrongly rejected.
    const nowMs = Date.now();
    const maxDate = new Date(nowMs + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const minDate = new Date(nowMs - 366 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    if (dto.caughtAt > maxDate) throw new BadRequestException('Дата вилову не може бути в майбутньому');
    if (dto.caughtAt < minDate) throw new BadRequestException('Дата вилову занадто давня');

    const hasComment = !!dto.comment && dto.comment.trim().length > 0;
    if (!file && !hasComment) throw new BadRequestException('Додайте фото або коментар');

    let photoUrl: string | undefined;
    const id = randomUUID();
    if (file) {
      if (!ALLOWED_MIME.includes(file.mimetype)) throw new BadRequestException('Непідтримуваний формат файлу');
      try {
        for (const { suffix, width } of SIZES) {
          const buf = await sharp(file.buffer)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          await this.storage.save(`catch-reports/${id}/${id}-${suffix}.webp`, buf);
        }
      } catch {
        for (const { suffix } of SIZES) {
          await this.storage.delete(`catch-reports/${id}/${id}-${suffix}.webp`);
        }
        throw new BadRequestException('Не вдалося обробити зображення');
      }
      photoUrl = `/uploads/catch-reports/${id}/${id}-full.webp`;
    }

    try {
      await this.prisma.catchReport.create({
        data: {
          id,
          waterId: water.id,
          fishId: dto.fishId,
          caughtAt: caught,
          comment: hasComment ? dto.comment : null,
          photoUrl,
          authorName: dto.authorName,
          authorEmail: dto.authorEmail,
          status: 'PENDING',
        },
      });
    } catch (e) {
      // Avoid orphaned image files if the row never lands (e.g. FK race / DB error).
      if (photoUrl) await this.storage.deleteDir(`catch-reports/${id}`);
      throw e;
    }
    return { ok: true };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  async adminList(q: AdminCatchReportsQueryDto) {
    const where = q.status ? { status: q.status as CatchReportStatus } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.catchReport.count({ where }),
      this.prisma.catchReport.findMany({
        where,
        include: { fish: { select: { name: true } }, water: { select: { slug: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return { items: rows, total, page: q.page, perPage: q.perPage };
  }

  async moderate(id: string, status: CatchReportStatus): Promise<void> {
    await this.prisma.catchReport.update({ where: { id }, data: { status } });
  }

  async remove(id: string): Promise<void> {
    const row = await this.prisma.catchReport.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`CatchReport "${id}" not found`);
    await this.prisma.catchReport.delete({ where: { id } });
    await this.storage.deleteDir(`catch-reports/${id}`);
  }
}
