import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShell {
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);

  logout() {
    this.api.logout().subscribe(() => this.router.navigate(['/admin/login']));
  }
}
