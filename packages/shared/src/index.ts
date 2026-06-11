export type WaterType = 'LAKE' | 'POND' | 'RIVER' | 'RESERVOIR' | 'FISHING_COMPLEX';
export const WATER_TYPES: WaterType[] = ['LAKE', 'POND', 'RIVER', 'RESERVOIR', 'FISHING_COMPLEX'];
export const WATER_TYPE_LABELS: Record<WaterType, string> = {
  LAKE: 'Озеро',
  POND: 'Став',
  RIVER: 'Річка',
  RESERVOIR: 'Водосховище',
  FISHING_COMPLEX: 'Риболовний комплекс',
};

export type WaterStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export const WATER_STATUSES: WaterStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export type Locale = 'uk' | 'en';
export const LOCALES: Locale[] = ['uk', 'en'];
export const DEFAULT_LOCALE: Locale = 'uk';

export interface RegionDto {
  id: number;
  slug: string;
  name: string;
}

export interface FishSpeciesDto {
  id: number;
  slug: string;
  name: string;
}

export interface AmenityDto {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
}

export interface MediaDto {
  id: string;
  urlThumb: string;
  urlCard: string;
  urlFull: string;
  alt: string | null;
  sortOrder: number;
}

export interface WaterListItemDto {
  id: string;
  slug: string;
  name: string;
  regionSlug: string;
  regionName: string;
  district: string | null;
  lat: number;
  lng: number;
  waterType: WaterType;
  isPaid: boolean;
  priceFrom: number | null;
  priceTo: number | null;
  verified: boolean;
  fishNames: string[];
  coverThumbUrl: string | null;
  coverCardUrl: string | null;
}

export interface WaterDetailDto extends WaterListItemDto {
  description: string;
  areaHa: number | null;
  priceNote: string | null;
  phone: string | null;
  website: string | null;
  rules: string | null;
  status: WaterStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  nameEn: string | null;
  descriptionEn: string | null;
  rulesEn: string | null;
  priceNoteEn: string | null;
  seoTitleEn: string | null;
  seoDescriptionEn: string | null;
  fish: FishSpeciesDto[];
  amenities: AmenityDto[];
  media: MediaDto[];
  createdAt: string;
  updatedAt: string;
}

export interface MapPinDto {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  isPaid: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}
