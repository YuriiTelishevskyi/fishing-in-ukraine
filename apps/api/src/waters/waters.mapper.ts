import {
  Locale,
  MapPinDto,
  MediaDto,
  WaterDetailDto,
  WaterListItemDto,
  WaterStatus,
  WaterType,
} from '@fishing/shared';
import {
  Amenity,
  FishSpecies,
  Media,
  Prisma,
  Region,
  Water,
  WaterAmenity,
  WaterFish,
} from '@prisma/client';

export const LIST_INCLUDE = {
  region: true,
  fish: { include: { fish: true } },
  media: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
} satisfies Prisma.WaterInclude;

export const FULL_INCLUDE = {
  region: true,
  fish: { include: { fish: true } },
  amenities: { include: { amenity: true } },
  media: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.WaterInclude;

/** Narrow row shape for list cards — region, fish, cover media only. */
export type WaterListRow = Water & {
  region: Region;
  fish: (WaterFish & { fish: FishSpecies })[];
  media: Media[];
};

export type WaterFull = WaterListRow & {
  amenities: (WaterAmenity & { amenity: Amenity })[];
};

// contract: media URLs stored in DB MUST end in '-full.webp' (media service generates
// <id>-thumb.webp / <id>-card.webp / <id>-full.webp alongside each other)
const variant = (fullUrl: string, v: 'thumb' | 'card') =>
  fullUrl.replace('-full.webp', `-${v}.webp`);

const loc = (lang: Locale, uk: string, en: string | null) => (lang === 'en' && en ? en : uk);

/** Effective premium: isPremium flag is on AND (no expiry OR expiry is in the future). */
const effectivePremium = (w: { isPremium: boolean; premiumUntil: Date | null }): boolean =>
  w.isPremium && (!w.premiumUntil || w.premiumUntil > new Date());
const locN = (lang: Locale, uk: string | null, en: string | null) =>
  lang === 'en' && en ? en : uk;

export function toMediaDto(m: Media): MediaDto {
  return {
    id: m.id,
    urlFull: m.url,
    urlCard: variant(m.url, 'card'),
    urlThumb: variant(m.url, 'thumb'),
    alt: m.alt,
    sortOrder: m.sortOrder,
  };
}

export function toListItem(w: WaterListRow, lang: Locale): WaterListItemDto {
  const cover = w.media[0] ?? null;
  return {
    id: w.id,
    slug: w.slug,
    name: loc(lang, w.name, w.nameEn),
    regionSlug: w.region.slug,
    regionName: loc(lang, w.region.name, w.region.nameEn),
    district: w.district,
    lat: w.lat,
    lng: w.lng,
    waterType: w.waterType as WaterType,
    isPremium: effectivePremium(w),
    isPaid: w.isPaid,
    priceFrom: w.priceFrom,
    priceTo: w.priceTo,
    verified: w.verified,
    fishNames: w.fish.map((f) => loc(lang, f.fish.name, f.fish.nameEn)),
    coverThumbUrl: cover ? variant(cover.url, 'thumb') : null,
    coverCardUrl: cover ? variant(cover.url, 'card') : null,
    ratingAvg: w.ratingAvg,
    ratingCount: w.ratingCount,
  };
}

export function toDetail(w: WaterFull, lang: Locale): WaterDetailDto {
  return {
    ...toListItem(w, lang),
    premiumUntil: w.premiumUntil ? w.premiumUntil.toISOString() : null,
    description: loc(lang, w.description, w.descriptionEn),
    areaHa: w.areaHa,
    priceNote: locN(lang, w.priceNote, w.priceNoteEn),
    phone: w.phone,
    website: w.website,
    rules: locN(lang, w.rules, w.rulesEn),
    status: w.status as WaterStatus,
    seoTitle: locN(lang, w.seoTitle, w.seoTitleEn),
    seoDescription: locN(lang, w.seoDescription, w.seoDescriptionEn),
    nameEn: w.nameEn,
    descriptionEn: w.descriptionEn,
    rulesEn: w.rulesEn,
    priceNoteEn: w.priceNoteEn,
    seoTitleEn: w.seoTitleEn,
    seoDescriptionEn: w.seoDescriptionEn,
    fish: w.fish.map((f) => ({
      id: f.fish.id,
      slug: f.fish.slug,
      name: loc(lang, f.fish.name, f.fish.nameEn),
    })),
    amenities: w.amenities.map((a) => ({
      id: a.amenity.id,
      slug: a.amenity.slug,
      name: loc(lang, a.amenity.name, a.amenity.nameEn),
      icon: a.amenity.icon,
    })),
    media: w.media.map(toMediaDto),
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export function toPin(
  w: Pick<Water, 'id' | 'slug' | 'name' | 'nameEn' | 'lat' | 'lng' | 'isPaid' | 'isPremium' | 'premiumUntil'> & {
    region: { slug: string };
  },
  lang: Locale,
): MapPinDto {
  return {
    id: w.id,
    slug: w.slug,
    name: loc(lang, w.name, w.nameEn),
    lat: w.lat,
    lng: w.lng,
    isPaid: w.isPaid,
    isPremium: effectivePremium(w),
    regionSlug: w.region.slug,
  };
}
