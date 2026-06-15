import { WaterNewsDto } from '@fishing/shared';

export function toWaterNewsDto(row: any, lang: string): WaterNewsDto {
  return {
    id: row.id,
    type: row.type,
    title: lang === 'en' && row.titleEn ? row.titleEn : row.title,
    body: lang === 'en' && row.bodyEn ? row.bodyEn : (row.body ?? null),
    date: row.date.toISOString().slice(0, 10),
    createdAt: row.createdAt.toISOString(),
  };
}
