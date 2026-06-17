import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminApiService, AdminReview } from '../core/admin-api.service';
import { AdminPageHeader } from '../shared/admin-page-header';
import { Paginated } from '@fishing/shared';

interface StatusOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-admin-reviews-list',
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
  templateUrl: './admin-reviews-list.html',
  styleUrl: './admin-reviews-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReviewsList implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly confirmationService = inject(ConfirmationService);
  // Shared shell-provided MessageService → toasts render in the shell's <p-toast>.
  private readonly messages = inject(MessageService);

  readonly rows = signal<AdminReview[]>([]);
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
      .adminReviews({
        status: this.status || undefined,
        page: this.page(),
        perPage: this.perPage,
      })
      .subscribe({
        next: (result: Paginated<AdminReview>) => {
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

  approve(review: AdminReview): void {
    this.adminApi.moderateReview(review.id, 'APPROVED').subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Схвалено', detail: review.authorName });
        this.load();
      },
      error: () => this.messages.add({ severity: 'error', summary: 'Помилка', detail: 'Не вдалося схвалити відгук' }),
    });
  }

  reject(review: AdminReview): void {
    this.adminApi.moderateReview(review.id, 'REJECTED').subscribe({
      next: () => {
        this.messages.add({ severity: 'warn', summary: 'Відхилено', detail: review.authorName });
        this.load();
      },
      error: () => this.messages.add({ severity: 'error', summary: 'Помилка', detail: 'Не вдалося відхилити відгук' }),
    });
  }

  confirmDelete(review: AdminReview): void {
    this.confirmationService.confirm({
      message: `Видалити відгук від «${review.authorName}»?`,
      header: 'Підтвердження',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Видалити',
      rejectLabel: 'Скасувати',
      accept: () => {
        this.adminApi.deleteReview(review.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Видалено', detail: review.authorName });
            this.load();
          },
          error: () => this.messages.add({ severity: 'error', summary: 'Помилка', detail: 'Не вдалося видалити відгук' }),
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

  stars(rating: number): string {
    return '★'.repeat(rating);
  }
}
