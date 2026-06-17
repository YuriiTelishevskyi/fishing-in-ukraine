import { ChangeDetectionStrategy, Component, ElementRef, Signal, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MapPinDto, SpotDto } from '@fishing/shared';
import { Subject, catchError, debounceTime, distinctUntilChanged, firstValueFrom, from, of, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { usePageLocale } from '../../core/use-locale';
import { Header } from '../../layout/header';
import { createMapPin, createRegionBubble } from '../../shared/map-pin';
import { GeoResult, geocodePlaces } from '../../shared/geocode';

/** Below this zoom level the map shows one bubble per oblast; at/above it, individual pins. */
const ZOOM_THRESHOLD = 8;

interface RegionGroup {
  slug: string;
  name: string;
  count: number;
  lat: number;
  lng: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Component({
  selector: 'app-map-page',
  imports: [Header, TranslocoPipe, FormsModule],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly pair = this.locale.pathPair('map');
  readonly regions = toSignal(this.api.regions(), { initialValue: [] });
  readonly fishList = toSignal(this.api.fishSpecies(), { initialValue: [] });
  readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');

  region = '';
  fish = '';
  paid = '';

  // Place-search (geocoding) signals
  readonly searchQuery = signal('');
  readonly searchResults = signal<GeoResult[]>([]);
  readonly searching = signal(false);
  readonly searchOpen = signal(false);
  private readonly searchInput$ = new Subject<string>();

  // Add-point mode signals
  readonly adding = signal(false);
  readonly picked = signal<{ lat: number; lng: number } | null>(null);
  readonly formPending = signal(false);
  readonly formSuccess = signal(false);
  readonly formError = signal<string | null>(null);
  readonly hintVisible = signal(false);
  // When true the add-point modal is temporarily hidden so the user can
  // re-click the map to re-place the picked marker.
  readonly modalMinimized = signal(false);

  // Form fields
  formName = '';
  formEmail = '';
  formComment = '';
  formFishNote = '';
  formTitle = '';
  formWebsite = ''; // honeypot
  photoFile: File | null = null;
  photoPreviewUrl: string | null = null;

  private map: any = null;
  private L: any = null;
  private bubbleLayer: any = null;
  private pinLayer: any = null;
  private spotsLayer: any = null;
  private tempMarker: any = null;

  // Spots data: loaded and refreshed manually
  private spotsData = signal<SpotDto[]>([]);

  constructor() {
    // Debounced place-search. The Subject only emits on user input, so this
    // never fires during SSR/construction; geocodePlaces runs browser-only.
    this.searchInput$
      .pipe(
        debounceTime(450),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 3) {
            this.searchResults.set([]);
            this.searching.set(false);
            return of([] as GeoResult[]);
          }
          this.searching.set(true);
          return from(geocodePlaces(q, this.locale.locale())).pipe(catchError(() => of([] as GeoResult[])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.searchResults.set(results);
        this.searching.set(false);
        this.searchOpen.set(true);
      });

    const uk = this.locale.locale() === 'uk';
    this.seo.apply({
      title: uk ? 'Карта водойм України — FishMap.ua' : 'Fishing waters map — FishMap.ua',
      description: uk ? 'Усі водойми каталогу на одній карті.' : 'All catalog waters on one map.',
      paths: this.pair,
      locale: this.locale.locale(),
    });

    afterNextRender(async () => {
      const leaflet = await import('leaflet');
      const L = (leaflet as any).default ?? leaflet;
      this.L = L;

      this.map = L.map(this.mapEl().nativeElement, {
        zoomControl: true,
        // Smooth trackpad/wheel + pinch zoom. zoomSnap 0.5 + a higher
        // wheelPxPerZoomLevel make trackpad scroll-zoom feel gradual.
        scrollWheelZoom: true,
        touchZoom: true,
        zoomSnap: 0.5,
        wheelPxPerZoomLevel: 80,
      }).setView([49.0, 31.0], 6);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(this.map);

      // Spotlight Ukraine: teal border + dim mask over everything outside the
      // country. Added before markers so they paint on top, non-interactive so
      // pin/bubble clicks pass through.
      this.addUkraineHighlight();

      // Map click handler for add-point mode
      this.map.on('click', (e: any) => {
        if (!this.adding()) return;
        this.placeMarker(e.latlng.lat, e.latlng.lng);
      });

      // Toggle between region bubbles (low zoom) and individual pins (high zoom).
      this.map.on('zoomend', () => this.renderWaterLayer());

      await this.refresh();
      await this.refreshSpots();
    });
  }

  async refresh() {
    if (!this.L || !this.map) return;
    const pins = await firstValueFrom(
      this.api.mapPins({
        region: this.region || undefined,
        fish: this.fish ? [this.fish] : undefined,
        paid: (this.paid as 'true' | 'false') || undefined,
      }),
    );
    const L = this.L;

    // Drop any previous layers (e.g. on filter change).
    if (this.bubbleLayer) this.bubbleLayer.remove();
    if (this.pinLayer) this.pinLayer.remove();

    // ── Individual water pins (shown when zoomed in) ──
    this.pinLayer = L.layerGroup();
    for (const p of pins) {
      const pinVariant = p.isPremium ? 'premium' : 'primary';
      const markerOpts: Record<string, unknown> = { icon: createMapPin(L, pinVariant) };
      if (p.isPremium) markerOpts['zIndexOffset'] = 1000;
      const m = L.marker([p.lat, p.lng], markerOpts);
      m.bindPopup(this.popupHtml(p));
      this.pinLayer.addLayer(m);
    }

    // ── Region bubbles (one per oblast, shown when zoomed out) ──
    // If the regions signal hasn't resolved yet (cold load), await the fetch so a
    // bubble never briefly shows a raw slug instead of the localized oblast name.
    const regionList = this.regions().length ? this.regions() : await firstValueFrom(this.api.regions());
    const regionNames = new Map(regionList.map((r) => [r.slug, r.name]));
    const groups = this.groupByRegion(pins, regionNames);
    this.bubbleLayer = L.layerGroup();
    for (const g of groups) {
      const m = L.marker([g.lat, g.lng], { icon: createRegionBubble(L, g.count) });
      m.bindTooltip(`${g.name} (${g.count})`, { direction: 'top', offset: [0, -8] });
      m.on('click', () => this.map.flyTo([g.lat, g.lng], ZOOM_THRESHOLD + 1));
      this.bubbleLayer.addLayer(m);
    }

    this.renderWaterLayer();
  }

  /** Group water pins by region slug into centroids (average lat/lng). */
  private groupByRegion(pins: MapPinDto[], names: Map<string, string>): RegionGroup[] {
    const acc = new Map<string, { count: number; latSum: number; lngSum: number }>();
    for (const p of pins) {
      const cur = acc.get(p.regionSlug) ?? { count: 0, latSum: 0, lngSum: 0 };
      cur.count += 1;
      cur.latSum += p.lat;
      cur.lngSum += p.lng;
      acc.set(p.regionSlug, cur);
    }
    const groups: RegionGroup[] = [];
    for (const [slug, v] of acc) {
      groups.push({
        slug,
        name: names.get(slug) ?? slug,
        count: v.count,
        lat: v.latSum / v.count,
        lng: v.lngSum / v.count,
      });
    }
    return groups;
  }

  /** Show region bubbles below the zoom threshold; individual pins at/above it. */
  private renderWaterLayer() {
    if (!this.map || !this.bubbleLayer || !this.pinLayer) return;
    const zoomedOut = this.map.getZoom() < ZOOM_THRESHOLD;
    if (zoomedOut) {
      if (this.map.hasLayer(this.pinLayer)) this.map.removeLayer(this.pinLayer);
      if (!this.map.hasLayer(this.bubbleLayer)) this.map.addLayer(this.bubbleLayer);
    } else {
      if (this.map.hasLayer(this.bubbleLayer)) this.map.removeLayer(this.bubbleLayer);
      if (!this.map.hasLayer(this.pinLayer)) this.map.addLayer(this.pinLayer);
    }
  }

  async refreshSpots() {
    if (!this.L || !this.map) return;
    const spots = await firstValueFrom(this.api.spots());
    this.spotsData.set(spots);

    if (this.spotsLayer) {
      this.spotsLayer.remove();
    }
    this.spotsLayer = this.L.layerGroup();
    for (const s of spots) {
      const m = this.L.marker([s.lat, s.lng], { icon: createMapPin(this.L, 'community') });
      m.bindPopup(this.spotPopupHtml(s));
      this.spotsLayer.addLayer(m);
    }
    this.spotsLayer.addTo(this.map);
  }

  /**
   * Fetch the simplified Ukraine boundary and render two non-interactive layers
   * below the markers: a teal border outline and a dim mask covering the world
   * with Ukraine punched out as a hole. Browser-only (called from
   * afterNextRender). Failures are swallowed — the map still works without it.
   */
  private async addUkraineHighlight() {
    if (!this.L || !this.map) return;
    try {
      const res = await fetch('/geo/ukraine.geojson');
      if (!res.ok) return;
      const geo = await res.json();
      const L = this.L;

      // Dim mask: world polygon (lat/lng) with each Ukraine ring as a hole.
      // Leaflet polygons use [lat, lng]; GeoJSON is [lng, lat] → swap.
      const worldRing: [number, number][] = [
        [-90, -180],
        [90, -180],
        [90, 180],
        [-90, 180],
      ];
      const holes = this.extractRings(geo).map((ring) =>
        ring.map(([lng, lat]) => [lat, lng] as [number, number]),
      );
      const mask = L.polygon([worldRing, ...holes], {
        stroke: false,
        fillColor: '#04222C',
        fillOpacity: 0.28,
        interactive: false,
      });
      mask.addTo(this.map);

      // Teal border outline.
      const border = L.geoJSON(geo, {
        style: { color: '#0E7490', weight: 2, opacity: 0.9, fill: false },
        interactive: false,
      });
      border.addTo(this.map);
    } catch {
      // ignore — highlight is purely decorative
    }
  }

  /** Flatten a (Multi)Polygon GeoJSON feature collection into a list of outer rings ([lng,lat][]). */
  private extractRings(geo: any): [number, number][][] {
    const rings: [number, number][][] = [];
    const features = geo?.type === 'FeatureCollection' ? geo.features : [geo];
    for (const f of features ?? []) {
      const g = f?.geometry ?? f;
      if (!g) continue;
      if (g.type === 'Polygon') {
        // outer ring only (index 0) — inner holes of the country itself are ignored
        if (g.coordinates?.[0]) rings.push(g.coordinates[0]);
      } else if (g.type === 'MultiPolygon') {
        for (const poly of g.coordinates ?? []) {
          if (poly?.[0]) rings.push(poly[0]);
        }
      }
    }
    return rings;
  }

  private popupHtml(p: MapPinDto): string {
    const isEn = this.locale.locale() === 'en';
    const seg = isEn ? '/en/waters' : '/vodoymy';
    const priceLabel = p.isPaid
      ? (isEn ? '₴ paid' : '₴ платна')
      : (isEn ? 'free' : 'безкоштовно');
    return `<strong>${p.name}</strong><br>${priceLabel}<br><a href="${seg}/${p.regionSlug}/${p.slug}">→ ${p.name}</a>`;
  }

  private spotPopupHtml(s: SpotDto): string {
    const d = new Date(s.createdAt);
    const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    let html = '';
    if (s.photoCardUrl) {
      html += `<img src="${escapeHtml(s.photoCardUrl)}" style="width:100%;border-radius:8px;margin-bottom:6px" alt="">`;
    }
    if (s.title) {
      html += `<strong>${escapeHtml(s.title)}</strong><br>`;
    }
    // Note: the free-text comment (read as a "відгук") is intentionally NOT shown
    // on the map popup — reviews/comments live on the water page, not the map.
    if (s.fishNote) {
      html += `🐟 ${escapeHtml(s.fishNote)}<br>`;
    }
    html += `<small>— ${escapeHtml(s.authorName)}, ${date}</small>`;
    return html;
  }

  // --- Place search (geocoding) ---

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  chooseResult(r: GeoResult) {
    if (this.map) this.map.setView([r.lat, r.lng], 13);
    if (this.adding()) this.placeMarker(r.lat, r.lng);
    this.searchOpen.set(false);
    this.searchResults.set([]);
    this.searchQuery.set(r.label);
  }

  // --- Add-point mode ---

  toggleAdding() {
    if (this.adding()) {
      this.cancelAdding();
    } else {
      this.adding.set(true);
      this.hintVisible.set(true);
    }
  }

  cancelAdding() {
    this.adding.set(false);
    this.hintVisible.set(false);
    this.modalMinimized.set(false);
    this.picked.set(null);
    this.formSuccess.set(false);
    this.formError.set(null);
    this.resetForm();
    if (this.tempMarker && this.map) {
      this.map.removeLayer(this.tempMarker);
      this.tempMarker = null;
    }
  }

  useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (this.map) this.map.setView([lat, lng], 13);
        this.placeMarker(lat, lng);
        this.hintVisible.set(false);
      },
      () => {
        this.formError.set('geo');
        setTimeout(() => this.formError.set(null), 4000);
      },
    );
  }

  private placeMarker(lat: number, lng: number) {
    if (!this.L || !this.map) return;
    if (this.tempMarker) {
      this.map.removeLayer(this.tempMarker);
    }
    this.tempMarker = this.L.marker([lat, lng], {
      icon: createMapPin(this.L, 'community'),
      draggable: true,
    });
    this.tempMarker.on('dragend', (e: any) => {
      const ll = e.target.getLatLng();
      this.picked.set({ lat: ll.lat, lng: ll.lng });
    });
    this.tempMarker.addTo(this.map);
    this.picked.set({ lat, lng });
    this.hintVisible.set(false);
    // Re-clicking the map after «Змінити точку» restores the modal with the
    // freshly-picked coordinates.
    this.modalMinimized.set(false);
  }

  /**
   * Temporarily hide the modal so the user can click a new point on the map.
   * The next map click (placeMarker) re-opens the modal with updated coords.
   */
  changePoint() {
    this.modalMinimized.set(true);
    this.hintVisible.set(true);
  }

  onPhotoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.photoFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.photoPreviewUrl = null;
    }
  }

  get formValid(): boolean {
    return (
      this.formName.trim().length >= 2 &&
      this.formComment.trim().length >= 10 &&
      this.picked() !== null
    );
  }

  submitSpot() {
    if (!this.formValid || this.formPending()) return;
    const coords = this.picked();
    if (!coords) return;

    this.formPending.set(true);
    this.formError.set(null);

    const fd = new FormData();
    fd.append('authorName', this.formName.trim());
    if (this.formEmail.trim()) fd.append('authorEmail', this.formEmail.trim());
    if (this.formTitle.trim()) fd.append('title', this.formTitle.trim());
    fd.append('comment', this.formComment.trim());
    if (this.formFishNote.trim()) fd.append('fishNote', this.formFishNote.trim());
    fd.append('lat', String(coords.lat));
    fd.append('lng', String(coords.lng));
    fd.append('website', this.formWebsite); // honeypot
    if (this.photoFile) fd.append('photo', this.photoFile);

    this.api.submitSpot(fd).subscribe({
      next: () => {
        this.formPending.set(false);
        this.formSuccess.set(true);
        // Remove temp marker
        if (this.tempMarker && this.map) {
          this.map.removeLayer(this.tempMarker);
          this.tempMarker = null;
        }
        this.picked.set(null);
        this.adding.set(false);
        // Reload spots — new one is PENDING so won't appear, that's expected
        this.refreshSpots();
      },
      error: (err) => {
        this.formPending.set(false);
        const status = err?.status;
        if (status === 429) {
          this.formError.set('rate');
        } else {
          this.formError.set('err');
        }
      },
    });
  }

  private resetForm() {
    this.formName = '';
    this.formEmail = '';
    this.formComment = '';
    this.formFishNote = '';
    this.formTitle = '';
    this.formWebsite = '';
    this.photoFile = null;
    this.photoPreviewUrl = null;
  }
}
