import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { AdminApiService, AdminCatchReport } from '../core/admin-api.service';
import { Paginated } from '@fishing/shared';

interface StatusOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-admin-catch-reports-list',
  imports: [
    FormsModule,
    DatePipe,
    TableModule,
    Select,
    ButtonModule,
    Tag,
    ConfirmDialog,
  ],
  providers: [ConfirmationService],
  templateUrl: './admin-catch-reports-list.html',
  styleUrl: './admin-catch-reports-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCatchReportsList implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly rows = signal<AdminCatchReport[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly page = signal(1);

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
      .adminCatchReports({
        status: this.status || undefined,
        page: this.page(),
        perPage: this.perPage,
      })
      .subscribe({
        next: (result: Paginated<AdminCatchReport>) => {
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

  onLazy(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.perPage;
    const newPage = Math.floor(first / rows) + 1;
    if (newPage !== this.page()) {
      this.page.set(newPage);
      this.load();
    }
  }

  approve(report: AdminCatchReport): void {
    this.adminApi.moderateCatchReport(report.id, 'APPROVED').subscribe({
      next: () => this.load(),
    });
  }

  reject(report: AdminCatchReport): void {
    this.adminApi.moderateCatchReport(report.id, 'REJECTED').subscribe({
      next: () => this.load(),
    });
  }

  confirmDelete(report: AdminCatchReport): void {
    this.confirmationService.confirm({
      message: `Видалити звіт від «${report.authorName}»?`,
      header: 'Підтвердження',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Видалити',
      rejectLabel: 'Скасувати',
      accept: () => {
        this.adminApi.deleteCatchReport(report.id).subscribe({
          next: () => this.load(),
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
}
