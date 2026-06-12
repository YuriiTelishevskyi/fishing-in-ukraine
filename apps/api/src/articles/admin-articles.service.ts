import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Paginated } from '@fishing/shared';
import { Article, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { slugify } from '../common/slugify';
import { StorageService } from '../media/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminArticlesQueryDto } from './dto/admin-articles-query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const COVER_SIZES = [
  { suffix: 'thumb', width: 320 },
  { suffix: 'card', width: 640 },
  { suffix: 'full', width: 1600 },
] as const;

@Injectable()
export class AdminArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'stattia';
    let slug = base;
    for (let i = 2; await this.prisma.article.findUnique({ where: { slug } }); i++) {
      slug = `${base}-${i}`;
    }
    return slug;
  }

  async list(q: AdminArticlesQueryDto): Promise<Paginated<Article>> {
    const and: Prisma.ArticleWhereInput[] = [];
    if (q.status) and.push({ status: q.status });
    if (q.search) and.push({ title: { contains: q.search, mode: 'insensitive' } });
    const where: Prisma.ArticleWhereInput = and.length ? { AND: and } : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return { items: rows, total, page: q.page, perPage: q.perPage };
  }

  async byId(id: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    return article;
  }

  async create(dto: CreateArticleDto): Promise<Article> {
    const { title, ...rest } = dto;
    return this.prisma.article.create({
      data: {
        ...rest,
        title,
        slug: await this.uniqueSlug(title),
      },
    });
  }

  async update(id: string, dto: UpdateArticleDto): Promise<Article> {
    const current = await this.byId(id);
    const data: Prisma.ArticleUpdateInput = { ...dto };

    // Set publishedAt on first transition to PUBLISHED
    if (dto.status === 'PUBLISHED' && current.publishedAt === null) {
      data.publishedAt = new Date();
    }

    return this.prisma.article.update({ where: { id }, data });
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.byId(id);
    await this.prisma.article.delete({ where: { id } });
    await this.storage.deleteDir(`articles/${id}`);
    return { ok: true };
  }

  async uploadCover(id: string, file: Express.Multer.File): Promise<Article> {
    if (!file || !ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('File is required or unsupported type');
    }
    const article = await this.byId(id);

    // Determine old uuid from existing coverUrl so we can delete old files after
    const oldCoverUrl = article.coverUrl;
    const oldUuid = oldCoverUrl
      ? oldCoverUrl.split('/').pop()?.replace('-full.webp', '') ?? null
      : null;

    const uuid = randomUUID();
    try {
      for (const { suffix, width } of COVER_SIZES) {
        const buf = await sharp(file.buffer)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        await this.storage.save(`articles/${id}/${uuid}-${suffix}.webp`, buf);
      }
    } catch {
      for (const { suffix } of COVER_SIZES) {
        await this.storage.delete(`articles/${id}/${uuid}-${suffix}.webp`);
      }
      throw new BadRequestException('Could not process image');
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: { coverUrl: `/uploads/articles/${id}/${uuid}-full.webp` },
    });

    // Delete old cover files after DB row is safely updated
    if (oldUuid) {
      for (const { suffix } of COVER_SIZES) {
        await this.storage.delete(`articles/${id}/${oldUuid}-${suffix}.webp`);
      }
    }

    return updated;
  }
}
