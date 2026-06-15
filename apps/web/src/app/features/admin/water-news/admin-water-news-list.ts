import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Tooltip } from 'primeng/tooltip';
import { AdminApiService, AdminWaterNews } from '../core/admin-api.service';

@Component({
  selector: 'app-admin-water-news-list',
  imports: [
    RouterLink,
    DatePipe,
    TableModule,
    ButtonModule,
    Tag,
    ConfirmDialog,
    Tooltip,
  ],
  providers: [ConfirmationService],
  templateUrl: './admin-water-news-list.html',
  styleUrl: './admin-water-news-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWaterNewsList implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly rows = signal<AdminWaterNews[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly page = signal(1);

  readonly perPage = 20;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminApi
      .adminWaterNews({
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

  onLazy(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.perPage;
    const newPage = Math.floor(first / rows) + 1;
    if (newPage !== this.page()) {
      this.page.set(newPage);
      this.load();
    }
  }

  typeSeverity(type: string): 'success' | 'info' | 'secondary' {
    switch (type) {
      case 'STOCKING': return 'success';
      case 'NEWS': return 'info';
      default: return 'secondary';
    }
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'STOCKING': return 'Зариблення';
      case 'NEWS': return 'Новина';
      default: return type;
    }
  }

  confirmDelete(n: AdminWaterNews): void {
    this.confirmationService.confirm({
      message: `Видалити новину «${n.title}»? Це незворотно.`,
      header: 'Підтвердження',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Видалити',
      rejectLabel: 'Скасувати',
      accept: () => {
        this.adminApi.deleteWaterNews(n.id).subscribe({
          next: () => this.load(),
        });
      },
    });
  }
}
