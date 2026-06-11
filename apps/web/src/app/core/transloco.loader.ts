import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import en from '../../assets/i18n/en.json';
import uk from '../../assets/i18n/uk.json';

const DICTS: Record<string, Translation> = { uk, en };

@Injectable({ providedIn: 'root' })
export class StaticTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of(DICTS[lang] ?? DICTS['uk']);
  }
}
