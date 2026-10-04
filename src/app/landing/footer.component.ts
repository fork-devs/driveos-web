import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LogoComponent } from '../shared/logo.component';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, LogoComponent],
  template: `
    <footer class="footer">
      <div class="wrap row">
        <a class="brand" href="#top" [attr.aria-label]="'nav.home' | transloco">
          <app-logo class="mark" />
          <span>DriveOS</span>
        </a>
        <p>{{ 'footer.credit' | transloco }} {{ 'footer.rights' | transloco }}</p>
      </div>
    </footer>
  `,
  styles: `
    .footer { padding-block: 36px; border-top: 1px solid var(--line); }

    .row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }

    .brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: -0.03em; }
    .mark { height: 28px; color: var(--c-primary); }

    p { font-size: 0.95rem; color: var(--muted); }
  `,
})
export class FooterComponent {}
