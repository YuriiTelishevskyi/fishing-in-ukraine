import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MediaDto, Paginated, WaterDetailDto, WaterStatus } from '@fishing/shared';
import { Observable } from 'rxjs';

export interface AdminWatersQuery {
  status?: WaterStatus;
  region?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

/** Mirrors CreateWaterDto/UpdateWaterDto of the API (Plan 1). */
export interface WaterPayload {
  name?: string;
  description?: string;
  regionId?: number;
  district?: string;
  lat?: number;
  lng?: number;
  areaHa?: number;
  waterType?: string;
  isPaid?: boolean;
  priceFrom?: number | null;
  priceTo?: number | null;
  priceNote?: string;
  phone?: string;
  website?: string;
  rules?: string;
  verified?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  nameEn?: string;
  descriptionEn?: string;
  rulesEn?: string;
  priceNoteEn?: string;
  seoTitleEn?: string;
  seoDescriptionEn?: string;
  fishIds?: number[];
  amenityIds?: number[];
  status?: WaterStatus;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  login(login: string, password: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>('/api/admin/login', { login, password });
  }

  logout(): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>('/api/admin/logout', {});
  }

  waters(q: AdminWatersQuery): Observable<Paginated<WaterDetailDto>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<Paginated<WaterDetailDto>>('/api/admin/waters', { params });
  }

  water(id: string): Observable<WaterDetailDto> {
    return this.http.get<WaterDetailDto>(`/api/admin/waters/${id}`);
  }

  create(payload: WaterPayload): Observable<WaterDetailDto> {
    return this.http.post<WaterDetailDto>('/api/admin/waters', payload);
  }

  update(id: string, payload: WaterPayload): Observable<WaterDetailDto> {
    return this.http.patch<WaterDetailDto>(`/api/admin/waters/${id}`, payload);
  }

  remove(id: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/admin/waters/${id}`);
  }

  uploadMedia(waterId: string, file: File): Observable<MediaDto> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<MediaDto>(`/api/admin/waters/${waterId}/media`, fd);
  }

  reorderMedia(waterId: string, ids: string[]): Observable<{ ok: true }> {
    return this.http.patch<{ ok: true }>(`/api/admin/waters/${waterId}/media/reorder`, { ids });
  }

  deleteMedia(id: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/admin/media/${id}`);
  }

  createFish(name: string, nameEn?: string) {
    return this.http.post('/api/admin/fish-species', { name, nameEn });
  }

  createAmenity(name: string, nameEn?: string) {
    return this.http.post('/api/admin/amenities', { name, nameEn });
  }
}
