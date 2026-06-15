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
  isPremium: boolean;
  verified: boolean;
  fishNames: string[];
  coverThumbUrl: string | null;
  coverCardUrl: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  viewCount: number;
}

export interface ReviewDto {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface WaterDetailDto extends WaterListItemDto {
  premiumUntil: string | null;
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

export interface NearbyWaterDto extends WaterListItemDto {
  distanceKm: number;
}

export interface MapPinDto {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  isPaid: boolean;
  isPremium: boolean;
  regionSlug: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface ArticleListItemDto {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverThumbUrl: string | null;
  coverCardUrl: string | null;
  publishedAt: string | null;
}

export interface ArticleDetailDto extends ArticleListItemDto {
  contentHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
  coverFullUrl: string | null;
  updatedAt: string;
}

export interface SpotDto {
  id: string;
  lat: number;
  lng: number;
  authorName: string;
  title: string | null;
  comment: string;
  fishNote: string | null;
  photoThumbUrl: string | null;
  photoCardUrl: string | null;
  createdAt: string;
}

export type SpotStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export const SPOT_STATUSES: SpotStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export interface MoonPhaseDto {
  phase: number; // 0..1
  illumination: number; // 0..1
  nameKey: string; // moon.new|waxingCrescent|firstQuarter|waxingGibbous|full|waningGibbous|lastQuarter|waningCrescent
}

export interface BiteFactors {
  pressure: number; // 0..1
  wind: number; // 0..1
  temp: number; // 0..1
  precip: number; // 0..1
  moon: number; // 0..1
}

export interface BiteDayDto {
  date: string;
  score: number; // 0..5 int
  factors: BiteFactors;
  moon: MoonPhaseDto;
  reasonKey: string; // bite.reason.poor|fair|good|great
}

export interface BiteForecastDto {
  available: boolean;
  days: BiteDayDto[];
  updatedAt: string | null;
}

export type PressureTrend = 'rising' | 'falling' | 'steady';
export type WindDir = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface WeatherCurrentDto {
  tempC: number;
  feelsC: number;
  humidity: number;
  precipMm: number;
  weatherCode: number;
  pressureHpa: number;
  pressureMmHg: number;
  pressureTrend: PressureTrend;
  windKmh: number;
  windDeg: number;
  windDir: WindDir;
}

export interface WeatherDailyDto {
  date: string;
  weatherCode: number;
  tMax: number;
  tMin: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherDto {
  available: boolean;
  current: WeatherCurrentDto | null;
  daily: WeatherDailyDto[];
  updatedAt: string | null;
}

export interface CatchReportDto {
  id: string;
  fishName: string;
  fishSlug: string;
  caughtAt: string;            // yyyy-mm-dd
  comment: string | null;
  photoThumbUrl: string | null;
  photoCardUrl: string | null;
  authorName: string;
  createdAt: string;
}

export type CatchReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export const CATCH_REPORT_STATUSES: CatchReportStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export interface FishRegionCountDto {
  regionSlug: string;
  regionName: string;
  count: number;
}

export type WaterNewsType = 'STOCKING' | 'NEWS';
export const WATER_NEWS_TYPES: WaterNewsType[] = ['STOCKING', 'NEWS'];

export interface WaterNewsDto {
  id: string;
  type: WaterNewsType;
  title: string;       // localized
  body: string | null; // localized
  date: string;        // yyyy-mm-dd
  createdAt: string;
}
