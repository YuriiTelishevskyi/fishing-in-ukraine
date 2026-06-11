import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminApiService } from '../core/admin-api.service';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLogin {
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);

  login = '';
  password = '';

  readonly error = signal<string | null>(null);
  readonly pending = signal(false);

  submit() {
    if (this.pending()) return;
    this.error.set(null);
    this.pending.set(true);

    this.api.login(this.login, this.password).subscribe({
      next: () => {
        this.pending.set(false);
        this.router.navigate(['/admin/waters']);
      },
      error: (err: unknown) => {
        this.pending.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.error.set('Невірний логін або пароль');
        } else {
          this.error.set('Помилка сервера. Спробуйте ще раз.');
        }
      },
    });
  }
}
