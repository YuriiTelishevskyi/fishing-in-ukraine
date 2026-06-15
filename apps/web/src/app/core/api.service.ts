import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AmenityDto, ArticleDetailDto, ArticleListItemDto, BiteForecastDto, CatchReportDto, FishRegionCountDto, FishSpeciesDto, MapPinDto, NearbyWaterDto, Paginated, RegionDto, ReviewDto, RiverDto, SpotDto, WaterDetailDto, WaterListItemDto, WaterNewsDto, WeatherDto,
} from '@fishing/shared';
import { Observable } from 'rxjs';
import { API_BASE } from './api-base';
import { LocaleService } from './locale.service';

export interface WatersFilter {
  region?: string;
  river?: string;
  fish?: string[];
  amenities?: string[];
  type?: string;
  paid?: 'true' | 'false';
  search?: string;
  page?: number;
  perPage?: number;
  sort?: 'popular';
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE);
  private readonly locale = inject(LocaleService);

  private params(extra: Record<string, string | number | undefined> = {}): HttpParams {
    let p = new HttpParams().set('lang', this.locale.locale());
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== '') p = p.set(k, String(v));
    }
    return p;
  }

  regions(): Observable<RegionDto[]> {
    return this.http.get<RegionDto[]>(`${this.base}/api/regions`, { params: this.params() });
  }

  rivers(): Observable<RiverDto[]> {
    return this.http.get<RiverDto[]>(`${this.base}/api/rivers`, { params: this.params() });
  }

  fishSpecies(): Observable<FishSpeciesDto[]> {
    return this.http.get<FishSpeciesDto[]>(`${this.base}/api/fish-species`, { params: this.params() });
  }

  amenities(): Observable<AmenityDto[]> {
    return this.http.get<AmenityDto[]>(`${this.base}/api/amenities`, { params: this.params() });
  }

  fishSpeciesRegions(slug: string): Observable<FishRegionCountDto[]> {
    return this.http.get<FishRegionCountDto[]>(`${this.base}/api/fish-species/${slug}/regions`, { params: this.params() });
  }

  waters(f: WatersFilter): Observable<Paginated<WaterListItemDto>> {
    return this.http.get<Paginated<WaterListItemDto>>(`${this.base}/api/waters`, {
      params: this.params({
        region: f.region,
        river: f.river,
        fish: f.fish?.length ? f.fish.join(',') : undefined,
        amenities: f.amenities?.length ? f.amenities.join(',') : undefined,
        type: f.type,
        paid: f.paid,
        search: f.search,
        page: f.page,
        perPage: f.perPage,
        sort: f.sort,
      }),
    });
  }

  mapPins(f: WatersFilter = {}): Observable<MapPinDto[]> {
    return this.http.get<MapPinDto[]>(`${this.base}/api/waters/map`, {
      params: this.params({
        region: f.region,
        fish: f.fish?.length ? f.fish.join(',') : undefined,
        type: f.type,
        paid: f.paid,
      }),
    });
  }

  water(slug: string): Observable<WaterDetailDto> {
    return this.http.get<WaterDetailDto>(`${this.base}/api/waters/${slug}`, { params: this.params() });
  }

  articles(page = 1): Observable<Paginated<ArticleListItemDto>> {
    return this.http.get<Paginated<ArticleListItemDto>>(`${this.base}/api/articles`, {
      params: this.params({ page, perPage: 12 }),
    });
  }

  article(slug: string): Observable<ArticleDetailDto> {
    return this.http.get<ArticleDetailDto>(`${this.base}/api/articles/${slug}`, { params: this.params() });
  }

  waterReviews(slug: string, page = 1): Observable<Paginated<ReviewDto>> {
    return this.http.get<Paginated<ReviewDto>>(`${this.base}/api/waters/${slug}/reviews`, {
      params: this.params({ page }),
    });
  }

  postReview(slug: string, payload: { authorName: string; rating: number; text: string; website?: string }): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/api/waters/${slug}/reviews`, payload);
  }

  waterCatchReports(slug: string, page = 1): Observable<Paginated<CatchReportDto>> {
    return this.http.get<Paginated<CatchReportDto>>(`${this.base}/api/waters/${slug}/catch-reports`, {
      params: this.params({ page }),
    });
  }

  submitCatchReport(slug: string, fd: FormData): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${this.base}/api/waters/${slug}/catch-reports`, fd);
  }

  waterNews(slug: string): Observable<WaterNewsDto[]> {
    return this.http.get<WaterNewsDto[]>(`${this.base}/api/waters/${slug}/news`, { params: this.params() });
  }

  spots(): Observable<SpotDto[]> {
    return this.http.get<SpotDto[]>(`${this.base}/api/spots`, { params: this.params() });
  }

  submitSpot(fd: FormData): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${this.base}/api/spots`, fd);
  }

  weather(lat: number, lng: number): Observable<WeatherDto> {
    return this.http.get<WeatherDto>(`${this.base}/api/weather`, {
      params: new HttpParams().set('lat', String(lat)).set('lng', String(lng)),
    });
  }

  biteForecast(lat: number, lng: number): Observable<BiteForecastDto> {
    return this.http.get<BiteForecastDto>(`${this.base}/api/bite-forecast`, {
      params: new HttpParams().set('lat', String(lat)).set('lng', String(lng)),
    });
  }

  watersNearby(lat: number, lng: number, radiusKm = 50, limit = 30): Observable<NearbyWaterDto[]> {
    return this.http.get<NearbyWaterDto[]>(`${this.base}/api/waters/nearby`, {
      params: this.params({ lat, lng, radiusKm, limit }),
    });
  }
}
