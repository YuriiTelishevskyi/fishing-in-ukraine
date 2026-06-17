import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AdminApiService } from '../core/admin-api.service';

/**
 * Admin shell. Hosts the global PrimeNG <p-toast /> and provides MessageService
 * at the shell level so every admin list/form page under this outlet can inject
 * MessageService and surface success/error toasts, e.g.:
 *
 *   private readonly messages = inject(MessageService);
 *   this.messages.add({ severity: 'success', summary: 'Збережено' });
 */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast],
  providers: [MessageService],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShell {
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly sidebarOpen = signal(false);

  constructor() {
    // PrimeIcons font is built as a non-injected `primeicons.css` bundle (so it
    // never weighs down the public initial bundle). Load it lazily, browser-side,
    // once the admin shell mounts — this brings in the `pi pi-*` glyphs used by
    // admin p-buttons/icons. Idempotent.
    if (this.isBrowser && !this.doc.getElementById('primeicons-css')) {
      const link = this.doc.createElement('link');
      link.id = 'primeicons-css';
      link.rel = 'stylesheet';
      link.href = 'primeicons.css';
      this.doc.head.appendChild(link);
    }
  }

  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  logout() {
    this.api.logout().subscribe(() => {
      this.messages.add({ severity: 'success', summary: 'Ви вийшли з адмінки' });
      this.router.navigate(['/admin/login']);
    });
  }
}
