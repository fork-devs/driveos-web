import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="theme-btn"
      type="button"
      (click)="theme.toggle()"
      [attr.aria-label]="theme.activeTheme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      [title]="theme.activeTheme() === 'dark' ? 'Modo claro' : 'Modo oscuro'"
    >
      @if (theme.activeTheme() === 'dark') {
        <i class="ph ph-sun-dim" aria-hidden="true"></i>
      } @else {
        <i class="ph ph-moon" aria-hidden="true"></i>
      }
    </button>
  `,
  styles: `
    .theme-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: var(--r-pill);
      border: 1px solid var(--line);
      background: color-mix(in srgb, var(--card) 90%, transparent);
      color: var(--fg);
      font-size: 1.15rem;
      cursor: pointer;
      transition: transform 0.2s var(--ease-out), border-color 0.2s var(--ease-out), background-color 0.2s;

      &:hover {
        border-color: var(--c-primary);
        color: var(--c-primary);
        transform: scale(1.05);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
}
