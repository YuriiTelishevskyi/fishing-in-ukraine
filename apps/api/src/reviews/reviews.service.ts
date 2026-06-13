import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Paginated, ReviewDto } from '@fishing/shared';
import { Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto';

const PER_PAGE = 10;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Recompute ratingAvg and ratingCount for a water from APPROVED reviews. */
  async recomputeAggregates(waterId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx ?? this.prisma;
    const agg = await db.review.aggregate({
      where: { waterId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const avg = agg._avg.rating;
    const count = agg._count.rating;
    await db.water.update({
      where: { id: waterId },
      data: {
        ratingAvg: avg != null ? Math.round(avg * 10) / 10 : null,
        ratingCount: count,
      },
    });
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  async listApproved(slug: string, page: number): Promise<Paginated<ReviewDto>> {
    const water = await this.prisma.water.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!water) throw new NotFoundException(`Water "${slug}" not found`);

    const where = { waterId: water.id, status: 'APPROVED' as ReviewStatus };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      perPage: PER_PAGE,
    };
  }

  async create(slug: string, dto: CreateReviewDto): Promise<{ ok: boolean }> {
    // Honeypot check
    if (dto.website && dto.website.trim().length > 0) {
      throw new BadRequestException('Spam detected');
    }

    const water = await this.prisma.water.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!water) throw new NotFoundException(`Water "${slug}" not found`);

    await this.prisma.review.create({
      data: {
        waterId: water.id,
        authorName: dto.authorName,
        rating: dto.rating,
        text: dto.text,
        status: 'PENDING',
      },
    });

    return { ok: true };
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  async adminList(q: AdminReviewsQueryDto) {
    const where = q.status ? { status: q.status } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: { water: { select: { slug: true, name: true } } },
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

  async moderate(id: string, status: ReviewStatus): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.update({
        where: { id },
        data: { status },
        select: { waterId: true },
      });
      await this.recomputeAggregates(review.waterId, tx);
    });
  }

  async remove(id: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { waterId: true },
    });
    if (!review) throw new NotFoundException(`Review "${id}" not found`);

    await this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id } });
      await this.recomputeAggregates(review.waterId, tx);
    });
  }
}
