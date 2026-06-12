import { ArticleDetailDto, ArticleListItemDto, Locale } from '@fishing/shared';
import { Article } from '@prisma/client';
import { MarkdownService } from '../common/markdown.service';

const loc = (lang: Locale, uk: string, en: string | null | undefined): string =>
  lang === 'en' && en ? en : uk;

const locN = (
  lang: Locale,
  uk: string | null | undefined,
  en: string | null | undefined,
): string | null => (lang === 'en' && en ? en : uk ?? null);

// cover URL stored as '-full.webp'; derive thumb/card variants
const coverVariant = (fullUrl: string | null, v: 'thumb' | 'card'): string | null =>
  fullUrl ? fullUrl.replace('-full.webp', `-${v}.webp`) : null;

export function toArticleListItem(a: Article, lang: Locale): ArticleListItemDto {
  return {
    id: a.id,
    slug: a.slug,
    title: loc(lang, a.title, a.titleEn),
    excerpt: loc(lang, a.excerpt, a.excerptEn),
    coverThumbUrl: coverVariant(a.coverUrl, 'thumb'),
    coverCardUrl: coverVariant(a.coverUrl, 'card'),
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
  };
}

export function toArticleDetail(
  a: Article,
  lang: Locale,
  markdown: MarkdownService,
): ArticleDetailDto {
  const contentMd = loc(lang, a.content, a.contentEn);
  return {
    ...toArticleListItem(a, lang),
    contentHtml: markdown.render(contentMd),
    seoTitle: locN(lang, a.seoTitle, a.seoTitleEn),
    seoDescription: locN(lang, a.seoDescription, a.seoDescriptionEn),
    coverFullUrl: a.coverUrl,
    updatedAt: a.updatedAt.toISOString(),
  };
}
