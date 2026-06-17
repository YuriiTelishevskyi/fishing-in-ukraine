import { ChangeDetectionStrategy, Component, ElementRef, Injector, PLATFORM_ID, afterNextRender, effect, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, forkJoin, from, of, switchMap } from 'rxjs';
import { AmenityDto, FishSpeciesDto, MediaDto, RegionDto, WaterDetailDto, WATER_TYPES, WATER_TYPE_LABELS, WaterType } from '@fishing/shared';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { InputNumber } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminApiService } from '../core/admin-api.service';
import { AdminPageHeader } from '../shared/admin-page-header';
import { ApiService } from '../../../core/api.service';
import { createMapPin } from '../../../shared/map-pin';
import { GeoResult, geocodePlaces } from '../../../shared/geocode';

function websiteValidator(control: AbstractControl) {
  const v = control.value as string;
  if (!v) return null;
  return /^https?:\/\/.+/.test(v) ? null : { website: true };
}

interface WaterTypeOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-admin-water-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Select,
    MultiSelect,
    ToggleSwitch,
    DatePicker,
    InputText,
    Textarea,
    InputNumber,
    ButtonModule,
    Tag,
    Toast,
    ConfirmDialog,
    AdminPageHeader,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-water-form.html',
  styleUrl: './admin-water-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWaterForm {
  private readonly adminApi = inject(AdminApiService);
  private readonly publicApi = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  readonly mapEl = viewChild<ElementRef<HTMLDivElement>>('pickMap');
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly id = this.route.snapshot.paramMap.get('id');
  readonly water = signal<WaterDetailDto | null>(null);
  readonly saving = signal(false);
  readonly statusUpdating = signal(false);
  readonly media = signal<MediaDto[]>([]);
  readonly uploading = signal(false);

  // Place-search (geocoding) signals
  readonly searchQuery = signal('');
  readonly searchResults = signal<GeoResult[]>([]);
  readonly searching = signal(false);
  readonly searchOpen = signal(false);
  private readonly searchInput$ = new Subject<string>();

  readonly regions = toSignal(this.publicApi.regions(), { initialValue: [] as RegionDto[] });
  readonly fishList = toSignal(this.publicApi.fishSpecies(), { initialValue: [] as FishSpeciesDto[] });
  readonly amenitiesList = toSignal(this.publicApi.amenities(), { initialValue: [] as AmenityDto[] });

  readonly waterTypeOptions: WaterTypeOption[] = WATER_TYPES.map((t) => ({
    label: WATER_TYPE_LABELS[t as WaterType],
    value: t,
  }));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', Validators.required],
    regionId: [null as number | null, Validators.required],
    district: [''],
    lat: [null as number | null, Validators.required],
    lng: [null as number | null, Validators.required],
    areaHa: [null as number | null],
    waterType: ['' as string, Validators.required],
    isPaid: [false],
    priceFrom: [null as number | null],
    priceTo: [null as number | null],
    priceNote: [''],
    phone: [''],
    website: ['', websiteValidator],
    rules: [''],
    verified: [false],
    isPremium: [false],
    premiumUntil: [null as Date | null],
    fishIds: [[] as number[]],
    amenityIds: [[] as number[]],
    nameEn: [''],
    descriptionEn: [''],
    rulesEn: [''],
    priceNoteEn: [''],
    seoTitleEn: [''],
    seoDescriptionEn: [''],
    seoTitle: [''],
    seoDescription: [''],
  });

  private leafletMap: any = null;
  private leafletMarker: any = null;
  private L: any = null;
  private mapReady = false;
  private mapMounted = false;
  private pendingCenter: [number, number] | null = null;

  constructor() {
    // Mount Leaflet once the #pickMap viewChild resolves to the LIVE (hydrated)
    // DOM node. We cannot mount directly from a constructor-time afterNextRender:
    // with SSR + client hydration, that callback runs against the server-rendered
    // node, which hydration then discards/recreates — Leaflet would mount on a
    // detached element and `.leaflet-container` never appears in the document.
    // Reading mapEl() inside an effect makes this re-run when the live node is
    // available; scheduling the actual mount via afterNextRender keeps it
    // browser-only and post-render. Same SSR-safe pattern as home/water-detail.
    effect(() => {
      const el = this.mapEl()?.nativeElement;
      if (!this.isBrowser || this.mapMounted || !el) return;
      this.mapMounted = true; // set BEFORE scheduling so the effect never re-enters
      afterNextRender(() => this.mountMap(), { injector: this.injector });
    });

    // Debounced place-search. The Subject only emits on user input, so this
    // never fires during SSR/construction; geocodePlaces runs browser-only.
    // Admin UI is UA-only, so we always geocode in Ukrainian.
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
          return from(geocodePlaces(q, 'uk')).pipe(catchError(() => of([] as GeoResult[])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.searchResults.set(results);
        this.searching.set(false);
        this.searchOpen.set(true);
      });

    if (this.id) {
      forkJoin({
        w: this.adminApi.water(this.id),
        regions: this.publicApi.regions(),
      }).subscribe({
        next: ({ w, regions }) => {
          this.water.set(w);
          this.media.set([...(w.media ?? [])]);
          const regionId = regions.find((r) => r.slug === w.regionSlug)?.id ?? null;
          this.form.patchValue({
            name: w.name,
            description: w.description,
            regionId,
            district: w.district ?? '',
            lat: w.lat,
            lng: w.lng,
            areaHa: w.areaHa ?? null,
            waterType: w.waterType,
            isPaid: w.isPaid,
            priceFrom: w.priceFrom ?? null,
            priceTo: w.priceTo ?? null,
            priceNote: w.priceNote ?? '',
            phone: w.phone ?? '',
            website: w.website ?? '',
            rules: w.rules ?? '',
            verified: w.verified,
            isPremium: w.isPremium,
            premiumUntil: w.premiumUntil ? new Date(w.premiumUntil) : null,
            fishIds: w.fish.map((f) => f.id),
            amenityIds: w.amenities.map((a) => a.id),
            nameEn: w.nameEn ?? '',
            descriptionEn: w.descriptionEn ?? '',
            rulesEn: w.rulesEn ?? '',
            priceNoteEn: w.priceNoteEn ?? '',
            seoTitleEn: w.seoTitleEn ?? '',
            seoDescriptionEn: w.seoDescriptionEn ?? '',
            seoTitle: w.seoTitle ?? '',
            seoDescription: w.seoDescription ?? '',
          });

          if (this.mapReady && this.leafletMap) {
            this.leafletMap.setView([w.lat, w.lng], 13);
            this.setMarker(w.lat, w.lng);
          } else {
            this.pendingCenter = [w.lat, w.lng];
          }
        },
        error: () => {
          this.toast.add({ severity: 'error', summary: 'Помилка', detail: 'Водойму не знайдено' });
        },
      });
    }
  }

  private async mountMap() {
    const leaflet = await import('leaflet');
    const L = (leaflet as any).default ?? leaflet;
    this.L = L;

    // IMPORTANT: re-read the viewChild element AFTER the dynamic import resolves.
    // Under SSR + client hydration, the await above yields control long enough for
    // Angular to run another hydration pass that detaches the original #pickMap
    // node and inserts a fresh one. Capturing the element before the await (or in
    // the constructor) mounts Leaflet on the now-detached node, so .leaflet-container
    // never appears in the document. Reading the live node here mounts on the
    // element actually in the DOM.
    const el = this.mapEl()?.nativeElement;
    if (!el) return;

    this.leafletMap = L.map(el).setView([49.0, 31.0], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.leafletMap);

    this.leafletMap.on('click', (e: any) => {
      const lat = +e.latlng.lat.toFixed(6);
      const lng = +e.latlng.lng.toFixed(6);
      this.setMarker(lat, lng);
      this.form.patchValue({ lat, lng });
    });

    this.mapReady = true;

    if (this.pendingCenter) {
      const [lat, lng] = this.pendingCenter;
      this.leafletMap.setView([lat, lng], 13);
      this.setMarker(lat, lng);
      this.pendingCenter = null;
    }
  }

  private setMarker(lat: number, lng: number) {
    if (!this.L || !this.leafletMap) return;
    if (this.leafletMarker) {
      this.leafletMarker.remove();
    }
    this.leafletMarker = this.L.marker([lat, lng], { icon: createMapPin(this.L, 'accent') }).addTo(this.leafletMap);
  }

  // --- Place search (geocoding) ---

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  chooseResult(r: GeoResult) {
    this.leafletMap?.setView([r.lat, r.lng], 13);
    const lat = +r.lat.toFixed(6);
    const lng = +r.lng.toFixed(6);
    this.setMarker(lat, lng);
    this.form.patchValue({ lat, lng });
    this.searchOpen.set(false);
    this.searchResults.set([]);
    this.searchQuery.set(r.label);
  }

  get isPaid() {
    return this.form.controls.isPaid.value;
  }

  get isPremium() {
    return this.form.controls.isPremium.value;
  }

  get currentStatus() {
    return this.water()?.status ?? 'DRAFT';
  }

  statusSeverity(status: string): 'warn' | 'success' | 'secondary' {
    switch (status) {
      case 'DRAFT': return 'warn';
      case 'PUBLISHED': return 'success';
      default: return 'secondary';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'DRAFT': return 'Чернетка';
      case 'PUBLISHED': return 'Опубліковано';
      default: return 'Архів';
    }
  }

  private buildPayload() {
    const v = this.form.getRawValue();
    const orUndef = (s: string | null | undefined) => (s ? s : undefined);
    const orNull = (n: number | null) => (n !== null ? n : undefined);

    const payload: Record<string, unknown> = {
      name: v.name,
      description: v.description,
      regionId: v.regionId!,
      waterType: v.waterType,
      lat: v.lat!,
      lng: v.lng!,
      isPaid: v.isPaid,
      verified: v.verified,
      isPremium: v.isPremium,
      premiumUntil: v.isPremium && v.premiumUntil ? (v.premiumUntil as Date).toISOString() : null,
      fishIds: v.fishIds,
      amenityIds: v.amenityIds,
    };

    if (v.district) payload['district'] = v.district;
    if (v.areaHa !== null) payload['areaHa'] = v.areaHa;
    if (v.phone) payload['phone'] = v.phone;
    if (v.website) payload['website'] = v.website;
    if (v.rules) payload['rules'] = v.rules;
    if (v.seoTitle) payload['seoTitle'] = v.seoTitle;
    if (v.seoDescription) payload['seoDescription'] = v.seoDescription;
    if (v.nameEn) payload['nameEn'] = v.nameEn;
    if (v.descriptionEn) payload['descriptionEn'] = v.descriptionEn;
    if (v.rulesEn) payload['rulesEn'] = v.rulesEn;
    if (v.seoTitleEn) payload['seoTitleEn'] = v.seoTitleEn;
    if (v.seoDescriptionEn) payload['seoDescriptionEn'] = v.seoDescriptionEn;

    if (v.isPaid) {
      if (v.priceFrom !== null) payload['priceFrom'] = v.priceFrom;
      if (v.priceTo !== null) payload['priceTo'] = v.priceTo;
      if (v.priceNote) payload['priceNote'] = v.priceNote;
      if (v.priceNoteEn) payload['priceNoteEn'] = v.priceNoteEn;
    }

    return payload;
  }

  private handleApiError(err: unknown) {
    if (err instanceof HttpErrorResponse) {
      const msg = err.error?.message;
      const detail = Array.isArray(msg) ? msg.join('; ') : (msg ?? `Помилка ${err.status}`);
      this.toast.add({ severity: 'error', summary: 'Помилка', detail });
    } else {
      this.toast.add({ severity: 'error', summary: 'Помилка', detail: 'Невідома помилка' });
    }
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    const payload = this.buildPayload();

    if (this.id) {
      this.adminApi.update(this.id, payload as any).subscribe({
        next: (w) => {
          this.saving.set(false);
          this.water.set(w);
          this.form.markAsPristine();
          this.toast.add({ severity: 'success', summary: 'Збережено', detail: w.name });
        },
        error: (err) => {
          this.saving.set(false);
          this.handleApiError(err);
        },
      });
    } else {
      this.adminApi.create(payload as any).subscribe({
        next: (w) => {
          this.saving.set(false);
          this.toast.add({ severity: 'success', summary: 'Збережено', detail: w.name });
          this.router.navigate(['/admin/waters', w.id]);
        },
        error: (err) => {
          this.saving.set(false);
          this.handleApiError(err);
        },
      });
    }
  }

  toggleStatus() {
    if (!this.id || this.statusUpdating()) return;
    const newStatus = this.currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    this.statusUpdating.set(true);
    this.adminApi.update(this.id, { status: newStatus } as any).subscribe({
      next: (w) => {
        this.statusUpdating.set(false);
        this.water.set(w);
        this.toast.add({
          severity: 'success',
          summary: newStatus === 'PUBLISHED' ? 'Опубліковано' : 'Переміщено в чернетку',
          detail: w.name,
        });
      },
      error: (err) => {
        this.statusUpdating.set(false);
        this.handleApiError(err);
      },
    });
  }

  triggerFileInput() {
    this.fileInput()?.nativeElement.click();
  }

  onFile(event: Event) {
    if (!this.id) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.adminApi.uploadMedia(this.id, file).subscribe({
      next: (dto) => {
        this.media.update((arr) => [...arr, dto]);
        this.uploading.set(false);
        input.value = '';
        this.toast.add({ severity: 'success', summary: 'Фото завантажено', detail: dto.alt ?? file.name });
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        input.value = '';
        if (err instanceof HttpErrorResponse && err.status === 400) {
          this.toast.add({ severity: 'error', summary: 'Помилка', detail: 'Непідтримуваний файл або зіпсоване зображення' });
        } else {
          this.handleApiError(err);
        }
      },
    });
  }

  moveMedia(index: number, direction: -1 | 1) {
    if (!this.id) return;
    const arr = [...this.media()];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= arr.length) return;
    [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
    this.media.set(arr);

    this.adminApi.reorderMedia(this.id, arr.map((m) => m.id)).subscribe({
      error: () => {
        // Revert by re-fetching
        this.adminApi.water(this.id!).subscribe({
          next: (w) => {
            this.media.set([...(w.media ?? [])]);
            this.toast.add({ severity: 'error', summary: 'Помилка', detail: 'Не вдалося змінити порядок фото' });
          },
        });
      },
    });
  }

  confirmDeleteMedia(m: MediaDto) {
    this.confirmationService.confirm({
      message: 'Видалити це фото? Це незворотно.',
      header: 'Підтвердження',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Видалити',
      rejectLabel: 'Скасувати',
      accept: () => {
        this.adminApi.deleteMedia(m.id).subscribe({
          next: () => {
            this.media.update((arr) => arr.filter((x) => x.id !== m.id));
            this.toast.add({ severity: 'success', summary: 'Фото видалено', detail: '' });
          },
          error: (err) => this.handleApiError(err),
        });
      },
    });
  }
}
