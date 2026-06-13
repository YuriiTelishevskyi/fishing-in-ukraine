import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MediaDto, Paginated, WaterDetailDto, WaterStatus } from '@fishing/shared';
import { Observable } from 'rxjs';

export type ArticleStatus = 'DRAFT' | 'PUBLISHED';

export interface AdminArticlesQuery {
  status?: ArticleStatus;
  search?: string;
  page?: number;
  perPage?: number;
}

/** Raw shape returned by the admin API (Prisma row — not the public DTO). */
export interface AdminArticle {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  excerpt: string;
  excerptEn: string | null;
  content: string;
  contentEn: string | null;
  coverUrl: string | null;
  status: ArticleStatus;
  publishedAt: string | null;
  seoTitle: string | null;
  seoTitleEn: string | null;
  seoDescription: string | null;
  seoDescriptionEn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticlePayload {
  title?: string;
  titleEn?: string;
  excerpt?: string;
  excerptEn?: string;
  content?: string;
  contentEn?: string;
  seoTitle?: string;
  seoTitleEn?: string;
  seoDescription?: string;
  seoDescriptionEn?: string;
  status?: ArticleStatus;
}

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

  // ── Articles ──────────────────────────────────────────────────────────────

  adminArticles(q: AdminArticlesQuery): Observable<Paginated<AdminArticle>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<Paginated<AdminArticle>>('/api/admin/articles', { params });
  }

  adminArticle(id: string): Observable<AdminArticle> {
    return this.http.get<AdminArticle>(`/api/admin/articles/${id}`);
  }

  createArticle(payload: ArticlePayload): Observable<AdminArticle> {
    return this.http.post<AdminArticle>('/api/admin/articles', payload);
  }

  updateArticle(id: string, payload: ArticlePayload): Observable<AdminArticle> {
    return this.http.patch<AdminArticle>(`/api/admin/articles/${id}`, payload);
  }

  deleteArticle(id: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/admin/articles/${id}`);
  }

  uploadArticleCover(id: string, file: File): Observable<AdminArticle> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<AdminArticle>(`/api/admin/articles/${id}/cover`, fd);
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  adminReviews(q: { status?: string; page?: number; perPage?: number }): Observable<Paginated<AdminReview>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<Paginated<AdminReview>>('/api/admin/reviews', { params });
  }

  moderateReview(id: string, status: 'APPROVED' | 'REJECTED'): Observable<AdminReview> {
    return this.http.patch<AdminReview>(`/api/admin/reviews/${id}`, { status });
  }

  deleteReview(id: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/admin/reviews/${id}`);
  }

  // ── Spots ─────────────────────────────────────────────────────────────────

  adminSpots(q: { status?: string; page?: number; perPage?: number }): Observable<Paginated<AdminSpot>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<Paginated<AdminSpot>>('/api/admin/spots', { params });
  }

  moderateSpot(id: string, status: 'APPROVED' | 'REJECTED'): Observable<AdminSpot> {
    return this.http.patch<AdminSpot>(`/api/admin/spots/${id}`, { status });
  }

  deleteSpot(id: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/admin/spots/${id}`);
  }
}

export interface AdminReview {
  id: string;
  waterId: string;
  authorName: string;
  rating: number;
  text: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  water: {
    slug: string;
    name: string;
  };
}

export interface AdminSpot {
  id: string;
  lat: number;
  lng: number;
  authorName: string;
  authorEmail: string | null;
  title: string | null;
  comment: string;
  fishNote: string | null;
  photoUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}
