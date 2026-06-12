import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AdminApiService, AdminArticle } from '../core/admin-api.service';

@Component({
  selector: 'app-admin-article-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputText,
    Textarea,
    ButtonModule,
    Tag,
    Toast,
  ],
  providers: [MessageService],
  templateUrl: './admin-article-form.html',
  styleUrl: './admin-article-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminArticleForm {
  private readonly adminApi = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  readonly coverInput = viewChild<ElementRef<HTMLInputElement>>('coverInput');

  readonly id = this.route.snapshot.paramMap.get('id');
  readonly article = signal<AdminArticle | null>(null);
  readonly saving = signal(false);
  readonly statusUpdating = signal(false);
  readonly uploading = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    excerpt: ['', Validators.required],
    content: ['', [Validators.required, Validators.minLength(50)]],
    titleEn: [''],
    excerptEn: [''],
    contentEn: [''],
    seoTitle: [''],
    seoDescription: [''],
    seoTitleEn: [''],
    seoDescriptionEn: [''],
  });

  constructor() {
    if (this.id) {
      this.adminApi.adminArticle(this.id).subscribe({
        next: (a) => {
          this.article.set(a);
          this.form.patchValue({
            title: a.title,
            excerpt: a.excerpt,
            content: a.content,
            titleEn: a.titleEn ?? '',
            excerptEn: a.excerptEn ?? '',
            contentEn: a.contentEn ?? '',
            seoTitle: a.seoTitle ?? '',
            seoDescription: a.seoDescription ?? '',
            seoTitleEn: a.seoTitleEn ?? '',
            seoDescriptionEn: a.seoDescriptionEn ?? '',
          });
        },
        error: () => {
          this.toast.add({ severity: 'error', summary: 'Помилка', detail: 'Статтю не знайдено' });
        },
      });
    }
  }

  get currentStatus() {
    return this.article()?.status ?? 'DRAFT';
  }

  get coverCardUrl(): string | null {
    const url = this.article()?.coverUrl;
    if (!url) return null;
    return url.replace('-full.webp', '-card.webp');
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
      default: return status;
    }
  }

  private orUndef(s: string): string | undefined {
    return s.trim() ? s.trim() : undefined;
  }

  private buildPayload() {
    const v = this.form.getRawValue();
    return {
      title: v.title,
      excerpt: v.excerpt,
      content: v.content,
      titleEn: this.orUndef(v.titleEn),
      excerptEn: this.orUndef(v.excerptEn),
      contentEn: this.orUndef(v.contentEn),
      seoTitle: this.orUndef(v.seoTitle),
      seoDescription: this.orUndef(v.seoDescription),
      seoTitleEn: this.orUndef(v.seoTitleEn),
      seoDescriptionEn: this.orUndef(v.seoDescriptionEn),
    };
  }

  private handleApiError(err: unknown) {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 409) {
        this.toast.add({ severity: 'error', summary: 'Помилка', detail: 'Стаття з таким slug вже існує' });
        return;
      }
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
      this.adminApi.updateArticle(this.id, payload).subscribe({
        next: (a) => {
          this.saving.set(false);
          this.article.set(a);
          this.form.markAsPristine();
          this.toast.add({ severity: 'success', summary: 'Збережено', detail: a.title });
        },
        error: (err) => {
          this.saving.set(false);
          this.handleApiError(err);
        },
      });
    } else {
      this.adminApi.createArticle(payload).subscribe({
        next: (a) => {
          this.saving.set(false);
          this.toast.add({ severity: 'success', summary: 'Збережено', detail: a.title });
          this.router.navigate(['/admin/articles', a.id]);
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
    this.adminApi.updateArticle(this.id, { status: newStatus }).subscribe({
      next: (a) => {
        this.statusUpdating.set(false);
        this.article.set(a);
        this.toast.add({
          severity: 'success',
          summary: newStatus === 'PUBLISHED' ? 'Опубліковано' : 'Переміщено в чернетку',
          detail: a.title,
        });
      },
      error: (err) => {
        this.statusUpdating.set(false);
        this.handleApiError(err);
      },
    });
  }

  triggerCoverInput() {
    this.coverInput()?.nativeElement.click();
  }

  onCoverFile(event: Event) {
    if (!this.id) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.adminApi.uploadArticleCover(this.id, file).subscribe({
      next: (a) => {
        this.article.set(a);
        this.uploading.set(false);
        input.value = '';
        this.toast.add({ severity: 'success', summary: 'Обкладинку завантажено', detail: a.title });
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
}
