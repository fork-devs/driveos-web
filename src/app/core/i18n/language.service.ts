import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

export type Lang = 'es' | 'en';

export const LANGS: readonly Lang[] = ['es', 'en'];

const STORAGE_KEY = 'driveos.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);

  private readonly _lang = signal<Lang>('es');
  readonly lang = this._lang.asReadonly();
  readonly other = computed<Lang>(() => (this._lang() === 'es' ? 'en' : 'es'));

  /** Picks the saved language, then the browser language, then Spanish. Resolves once its JSON is loaded. */
  async init(): Promise<void> {
    await this.use(this.detect());
  }

  async use(lang: Lang): Promise<void> {
    this.transloco.setActiveLang(lang);
    await firstValueFrom(this.transloco.load(lang));
    this._lang.set(lang);
    this.doc.documentElement.lang = lang;
    this.doc.title = this.transloco.translate('meta.title');
    this.doc
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', this.transloco.translate('meta.description'));
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage can be blocked, the page still works */
    }
  }

  private detect(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'es' || saved === 'en') return saved;
    } catch {
      /* ignore */
    }
    return this.doc.defaultView?.navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
  }
}
