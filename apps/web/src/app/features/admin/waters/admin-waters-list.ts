import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WaterDetailDto, WaterStatus } from '@fishing/shared';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputText } from 'primeng/inputtext';
import { Tooltip } from 'primeng/tooltip';
import { AdminApiService } from '../core/admin-api.service';
import { AdminPageHeader } from '../shared/admin-page-header';

interface StatusOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-admin-waters-list',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    TableModule,
    Select,
    ButtonModule,
    Tag,
    ConfirmDialog,
    InputText,
    Tooltip,
    AdminPageHeader,
  ],
  providers: [ConfirmationService],
  templateUrl: './admin-waters-list.html',
  styleUrl: './admin-waters-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWatersList implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly confirmationService = inject(ConfirmationService);
  // Shared shell-provided MessageService → toasts render in the shell's <p-toast>.
  private readonly messages = inject(MessageService);

  readonly rows = signal<WaterDetailDto[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly page = signal(1);

  status: WaterStatus | '' = '';
  search = '';

  readonly perPage = 20;

  readonly statusOptions: StatusOption[] = [
    { label: 'Всі', value: '' },
    { label: 'Чернетка', value: 'DRAFT' },
    { label: 'Опубліковано', value: 'PUBLISHED' },
    { label: 'Архів', value: 'ARCHIVED' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminApi
      .waters({
        status: this.status || undefined,
        search: this.search || undefined,
        page: this.page(),
        perPage: this.perPage,
      })
      .subscribe({
        next: (result) => {
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
    this.load();
  }

  onSearchEnterOrBlur(): void {
    this.page.set(1);
    this.load();
  }

  onLazy(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.perPage;
    const newPage = Math.floor(first / rows) + 1;
    if (newPage !== this.page()) {
      this.page.set(newPage);
      this.load();
    }
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

  confirmDelete(w: WaterDetailDto): void {
    this.confirmationService.confirm({
      message: `Видалити «${w.name}»? Це незворотно.`,
      header: 'Підтвердження',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Видалити',
      rejectLabel: 'Скасувати',
      accept: () => {
        this.adminApi.remove(w.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Видалено', detail: w.name });
            this.load();
          },
          error: () => this.messages.add({ severity: 'error', summary: 'Помилка', detail: 'Не вдалося видалити водойму' }),
        });
      },
    });
  }
}
