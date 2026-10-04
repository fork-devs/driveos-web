import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LOGO_PARTS, LOGO_VIEWBOX } from './logo-paths';

/** DriveOS mark, traced from the brand PNG. Inherits color from the parent (currentColor). */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="viewBox" fill="currentColor" role="img" [attr.aria-label]="label()">
      @for (p of parts; track p.id) {
        <path [attr.d]="p.d" [attr.transform]="'translate(' + p.x + ' ' + p.y + ')'" />
      }
    </svg>
  `,
  styles: `
    :host { display: inline-block; line-height: 0; }
    svg { height: 100%; width: auto; }
  `,
})
export class LogoComponent {
  readonly label = input('DriveOS');
  protected readonly parts = LOGO_PARTS;
  protected readonly viewBox = LOGO_VIEWBOX;
}
