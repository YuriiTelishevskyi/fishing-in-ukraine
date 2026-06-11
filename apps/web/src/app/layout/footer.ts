import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  readonly loc = inject(LocaleService);
}
