import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminApiService, AdminSpot } from '../core/admin-api.service';
import { AdminPageHeader } from '../shared/admin-page-header';
import { Paginated } from '@fishing/shared';
import { createMapPin } from '../../../shared/map-pin';

interface StatusOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-admin-spots-list',
  imports: [
    FormsModule,
    DatePipe,
    TableModule,
    Select,
    ButtonModule,
    Tag,
    Tooltip,
    ConfirmDialog,
    AdminPageHeader,
  ],
  providers: [ConfirmationService],
  templateUrl: './admin-spots-list.html',
  styleUrl: './admin-spots-list.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class AdminSpotsList implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly confirmationService = inject(ConfirmationService);
  // Shared shell-provided MessageService → toasts render in the shell's <p-toast>.
  private readonly messages = inject(MessageService);
  private readonly injector = inject(Injector);

  readonly rows = signal<AdminSpot[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly page = signal(1);

  /** Id of the currently expanded row (one at a time — simple signal toggle). */
  readonly expandedRowId = signal<string | null>(null);

  /** Track which row map elements have already been mounted. */
  private readonly mountedMaps = new Set<string>();

  status: string = 'PENDING';
  readonly perPage = 20;

  readonly statusOptions: StatusOption[] = [
    { label: 'На модерації', value: 'PENDING' },
    { label: 'Схвалені', value: 'APPROVED' },
    { label: 'Відхилені', value: 'REJECTED' },
    { label: 'Всі', value: '' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminApi
      .adminSpots({
        status: this.status || undefined,
        page: this.page(),
        perPage: this.perPage,
      })
      .subscribe({
        next: (result: Paginated<AdminSpot>) => {
          this.rows.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  onStatusChange(): void {
    this.page.set(1);
    this.expandedRowId.set(null);
    this.mountedMaps.clear();
    this.load();
  }

  onLazy(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.perPage;
    const newPage = Math.floor(first / rows) + 1;
    if (newPage !== this.page()) {
      this.page.set(newPage);
      this.expandedRowId.set(null);
      this.mountedMaps.clear();
      this.load();
    }
  }

  approve(spot: AdminSpot): void {
    this.adminApi.moderateSpot(spot.id, 'APPROVED').subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Схвалено', detail: spot.authorName });
        this.load();
      },
      error: () => this.messages.add({ severity: 'error', summary: 'Помилка', detail: 'Не вдалося схвалити точку' }),
    });
  }

  reject(spot: AdminSpot): void {
    this.adminApi.moderateSpot(spot.id, 'REJECTED').subscribe({
      next: () => {
        this.messages.add({ severity: 'warn', summary: 'Відхилено', detail: spot.authorName });
        this.load();
      },
      error: () => this.messages.add({ severity: 'error', summary: 'Помилка', detail: 'Не вдалося відхилити точку' }),
    });
  }

  confirmDelete(spot: AdminSpot): void {
    this.confirmationService.confirm({
      message: `Видалити точку від «${spot.authorName}»?`,
      header: 'Підтвердження',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Видалити',
      rejectLabel: 'Скасувати',
      accept: () => {
        this.adminApi.deleteSpot(spot.id).subscribe({
          next: () => {
            this.mountedMaps.delete(spot.id);
            this.messages.add({ severity: 'success', summary: 'Видалено', detail: spot.authorName });
            this.load();
          },
          error: () => this.messages.add({ severity: 'error', summary: 'Помилка', detail: 'Не вдалося видалити точку' }),
        });
      },
    });
  }

  showStatusColumn(): boolean {
    return this.status === '';
  }

  statusSeverity(status: string): 'warn' | 'success' | 'secondary' {
    switch (status) {
      case 'PENDING': return 'warn';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'secondary';
      default: return 'secondary';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'На модерації';
      case 'APPROVED': return 'Схвалено';
      case 'REJECTED': return 'Відхилено';
      default: return status;
    }
  }

  thumbUrl(photoUrl: string): string {
    return photoUrl.replace('-full.webp', '-thumb.webp');
  }

  isExpanded(spot: AdminSpot): boolean {
    return this.expandedRowId() === spot.id;
  }

  toggleRow(spot: AdminSpot): void {
    const id = spot.id;
    if (this.expandedRowId() === id) {
      this.expandedRowId.set(null);
      return;
    }
    this.expandedRowId.set(id);
    // Mount Leaflet after the next render tick (row is always in DOM, just hidden).
    // Guard against double-mount across multiple expansions.
    if (!this.mountedMaps.has(id)) {
      this.mountedMaps.add(id);
      afterNextRender(() => this.mountMapForRow(id), { injector: this.injector });
    }
  }

  private async mountMapForRow(id: string): Promise<void> {
    // Re-read the element AFTER the dynamic import resolves to guard against
    // any Angular DOM reconciliation during the await.
    const el = document.getElementById(`spot-map-${id}`);
    if (!el || (el as HTMLElement).dataset['mounted'] === '1') return;
    (el as HTMLElement).dataset['mounted'] = '1';

    const leaflet = await import('leaflet');
    const L = (leaflet as any).default ?? leaflet;

    // Re-read the element again AFTER the async Leaflet import in case Angular
    // replaced the DOM node during the await (same guard as admin-water-form.ts).
    const target = document.getElementById(`spot-map-${id}`);
    if (!target) return;

    const spot = this.rows().find((r) => r.id === id);
    if (!spot) return;

    const map = L.map(target, { zoomControl: true });
    map.setView([spot.lat, spot.lng], 13);
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 19 },
    ).addTo(map);
    L.marker([spot.lat, spot.lng], { icon: createMapPin(L, 'community') }).addTo(map);
  }
}
