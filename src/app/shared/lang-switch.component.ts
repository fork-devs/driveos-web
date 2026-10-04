import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LANGS, Lang, LanguageService } from '../core/i18n/language.service';

/** ES / EN segmented switch with Steep editorial pill geometry */
@Component({
  selector: 'app-lang-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <div class="lang-pill" role="group" [attr.aria-label]="'nav.language' | transloco">
      @for (l of langs; track l) {
        <button
          type="button"
          class="lang-btn"
          [attr.lang]="l"
          [attr.aria-pressed]="l === lang()"
          (click)="set(l)"
        >
          {{ l.toUpperCase() }}
        </button>
      }
    </div>
  `,
  styles: `
    .lang-pill {
      display: inline-flex;
      align-items: center;
      padding: 2px;
      border: 1px solid var(--line);
      border-radius: var(--r-pill);
      background: color-mix(in srgb, var(--card) 60%, transparent);
    }

    .lang-btn {
      min-width: 32px;
      height: 28px;
      padding: 0 8px;
      border: 0;
      border-radius: var(--r-pill);
      background: transparent;
      font-weight: 700;
      font-size: 0.76rem;
      letter-spacing: 0.04em;
      color: var(--muted);
      cursor: pointer;
      transition: background-color 0.2s var(--ease-out), color 0.2s var(--ease-out), transform 0.15s;

      &:hover:not([aria-pressed='true']) {
        color: var(--fg);
      }
    }

    .lang-btn[aria-pressed='true'] {
      background: var(--c-ink);
      color: var(--c-paper);
    }
  `,
})
export class LangSwitchComponent {
  protected readonly langs = LANGS;
  private readonly language = inject(LanguageService);
  protected readonly lang = this.language.lang;

  protected set(l: Lang): void {
    void this.language.use(l);
  }
}
