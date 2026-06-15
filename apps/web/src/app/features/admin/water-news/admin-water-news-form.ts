import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AdminApiService, AdminWaterNews, WaterNewsInput } from '../core/admin-api.service';

interface WaterOption {
  label: string;
  value: string;
}

interface TypeOption {
  label: string;
  value: 'STOCKING' | 'NEWS';
}

function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

@Component({
  selector: 'app-admin-water-news-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputText,
    Textarea,
    Select,
    ButtonModule,
    Toast,
  ],
  providers: [MessageService],
  templateUrl: './admin-water-news-form.html',
  styleUrl: './admin-water-news-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWaterNewsForm {
  private readonly adminApi = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);

  readonly id = this.route.snapshot.paramMap.get('id');
  readonly news = signal<AdminWaterNews | null>(null);
  readonly saving = signal(false);
  readonly waterOptions = signal<WaterOption[]>([]);

  readonly typeOptions: TypeOption[] = [
    { label: 'Зариблення', value: 'STOCKING' },
    { label: 'Новина', value: 'NEWS' },
  ];

  readonly form = this.fb.nonNullable.group({
    waterId: ['', Validators.required],
    type: ['NEWS' as 'STOCKING' | 'NEWS', Validators.required],
    date: [todayIso(), Validators.required],
    title: ['', [Validators.required, Validators.minLength(3)]],
    titleEn: [''],
    body: [''],
    bodyEn: [''],
  });

  constructor() {
    this.adminApi.waters({ perPage: 100 }).subscribe({
      next: (res) => {
        this.waterOptions.set(res.items.map((w) => ({ label: w.name, value: w.id })));
      },
    });

    if (this.id) {
      this.adminApi.waterNewsById(this.id).subscribe({
        next: (n) => {
          this.news.set(n);
          this.form.patchValue({
            waterId: n.waterId,
            type: n.type,
            date: n.date?.slice(0, 10) ?? todayIso(),
            title: n.title,
            titleEn: n.titleEn ?? '',
            body: n.body ?? '',
            bodyEn: n.bodyEn ?? '',
          });
        },
        error: () => {
          this.toast.add({ severity: 'error', summary: 'Помилка', detail: 'Новину не знайдено' });
        },
      });
    }
  }

  private orUndef(s: string): string | undefined {
    return s.trim() ? s.trim() : undefined;
  }

  private buildPayload(): WaterNewsInput {
    const v = this.form.getRawValue();
    return {
      waterId: v.waterId,
      type: v.type,
      date: v.date,
      title: v.title,
      titleEn: this.orUndef(v.titleEn),
      body: this.orUndef(v.body),
      bodyEn: this.orUndef(v.bodyEn),
    };
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
      this.adminApi.updateWaterNews(this.id, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/admin/water-news']);
        },
        error: (err) => {
          this.saving.set(false);
          this.handleApiError(err);
        },
      });
    } else {
      this.adminApi.createWaterNews(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/admin/water-news']);
        },
        error: (err) => {
          this.saving.set(false);
          this.handleApiError(err);
        },
      });
    }
  }
}
