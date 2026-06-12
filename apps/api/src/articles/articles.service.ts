import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleDetailDto, ArticleListItemDto, Locale, Paginated } from '@fishing/shared';
import { MarkdownService } from '../common/markdown.service';
import { PrismaService } from '../prisma/prisma.service';
import { toArticleDetail, toArticleListItem } from './articles.mapper';
import { ArticlesQueryDto } from './dto/articles-query.dto';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly markdown: MarkdownService,
  ) {}

  async list(q: ArticlesQueryDto): Promise<Paginated<ArticleListItemDto>> {
    const where = { status: 'PUBLISHED' as const };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return {
      items: rows.map((a) => toArticleListItem(a, q.lang as Locale)),
      total,
      page: q.page,
      perPage: q.perPage,
    };
  }

  async bySlug(slug: string, lang: Locale): Promise<ArticleDetailDto> {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    if (!article || article.status !== 'PUBLISHED') {
      throw new NotFoundException(`Article '${slug}' not found`);
    }
    return toArticleDetail(article, lang, this.markdown);
  }
}
