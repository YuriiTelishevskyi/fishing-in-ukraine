import { SpotDto } from '@fishing/shared';
import { Spot } from '@prisma/client';

export function toSpotDto(row: Spot): SpotDto {
  let photoThumbUrl: string | null = null;
  let photoCardUrl: string | null = null;

  if (row.photoUrl) {
    photoThumbUrl = row.photoUrl.replace('-full.webp', '-thumb.webp');
    photoCardUrl = row.photoUrl.replace('-full.webp', '-card.webp');
  }

  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    authorName: row.authorName,
    title: row.title ?? null,
    comment: row.comment,
    fishNote: row.fishNote ?? null,
    photoThumbUrl,
    photoCardUrl,
    createdAt: row.createdAt.toISOString(),
  };
}
