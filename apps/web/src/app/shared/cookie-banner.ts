import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConsentService } from '../core/consent.service';

@Component({
  selector: 'app-cookie-banner',
  imports: [TranslocoPipe],
  templateUrl: './cookie-banner.html',
  styleUrl: './cookie-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieBanner {
  private readonly consent = inject(ConsentService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Show only in the browser and only while consent is still unset. */
  readonly visible = computed(() => this.isBrowser && this.consent.consent() === null);

  accept(): void {
    this.consent.grant();
  }

  decline(): void {
    this.consent.deny();
  }
}
