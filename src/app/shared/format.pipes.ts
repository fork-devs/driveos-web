import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../core/i18n/language.service';

const LOCALE = { es: 'es-PE', en: 'en-US' } as const;

/** Money in soles, formatted for the active language. Impure so it follows language changes. */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly lang = inject(LanguageService).lang;

  transform(value: number): string {
    return new Intl.NumberFormat(LOCALE[this.lang()], {
      style: 'currency',
      currency: 'PEN',
      maximumFractionDigits: 2,
    }).format(value);
  }
}

/** Short date and time ("12 sep, 08:40") for the active language. */
@Pipe({ name: 'when', pure: false })
export class WhenPipe implements PipeTransform {
  private readonly lang = inject(LanguageService).lang;

  transform(iso: string): string {
    // Some backend resources carry no date; an empty or invalid value reads as a dash instead of throwing.
    if (!iso || Number.isNaN(new Date(iso).getTime())) return '—';
    return new Intl.DateTimeFormat(LOCALE[this.lang()], {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }
}
