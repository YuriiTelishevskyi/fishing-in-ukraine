import { Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './core/analytics';
import { ConsentService } from './core/consent.service';
import { CookieBanner } from './shared/cookie-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CookieBanner],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly consent = inject(ConsentService);
  private readonly analytics = inject(AnalyticsService);

  constructor() {
    // Browser-only: if the user already accepted cookies on a prior visit,
    // load analytics straight away (no-op when no GA id is configured).
    afterNextRender(() => {
      if (this.consent.consent() === 'granted') {
        this.analytics.enable();
      }
    });
  }
}
