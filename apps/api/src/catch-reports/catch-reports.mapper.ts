import { CatchReportDto, Locale } from '@fishing/shared';
import { CatchReport, FishSpecies } from '@prisma/client';

export function toCatchReportDto(row: CatchReport & { fish: FishSpecies }, lang: Locale): CatchReportDto {
  let photoThumbUrl: string | null = null;
  let photoCardUrl: string | null = null;
  if (row.photoUrl) {
    photoThumbUrl = row.photoUrl.replace('-full.webp', '-thumb.webp');
    photoCardUrl = row.photoUrl.replace('-full.webp', '-card.webp');
  }
  return {
    id: row.id,
    fishName: lang === 'en' ? row.fish.nameEn : row.fish.name,
    fishSlug: row.fish.slug,
    caughtAt: row.caughtAt.toISOString().slice(0, 10),
    comment: row.comment ?? null,
    photoThumbUrl,
    photoCardUrl,
    authorName: row.authorName,
    createdAt: row.createdAt.toISOString(),
  };
}
