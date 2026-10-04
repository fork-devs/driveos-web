import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Wraps a data view with its three non-happy states: skeleton while loading,
 * an inline error with retry, and an empty message. Content shows only when there is data.
 */
@Component({
  selector: 'app-async-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @if (loading()) {
      <div class="skeleton" role="status" [attr.aria-label]="'app.common.loading' | transloco">
        @for (n of [0, 1, 2, 3]; track n) {
          <span class="bar" [style.--w]="90 - n * 12 + '%'"></span>
        }
      </div>
    } @else if (error()) {
      <div class="box" role="alert">
        <i class="ph ph-cloud-slash" aria-hidden="true"></i>
        <p>{{ 'app.common.error' | transloco }}</p>
        <button class="btn btn-quiet" type="button" (click)="retry.emit()">{{ 'app.common.retry' | transloco }}</button>
      </div>
    } @else if (empty()) {
      <div class="box">
        <i class="ph ph-tray" aria-hidden="true"></i>
        <p>{{ emptyKey() | transloco }}</p>
      </div>
    } @else {
      <ng-content />
    }
  `,
  styles: `
    .skeleton { display: grid; gap: 14px; padding-block: 8px; }

    .bar {
      display: block;
      height: 18px;
      width: var(--w);
      border-radius: 8px;
      background: linear-gradient(90deg, var(--line) 0%, color-mix(in srgb, var(--line) 40%, transparent) 50%, var(--line) 100%);
      background-size: 200% 100%;
      animation: shimmer 1.4s linear infinite;
    }

    @keyframes shimmer { to { background-position: -200% 0; } }

    .box {
      display: grid;
      justify-items: center;
      gap: 12px;
      padding: 40px 16px;
      border: 1px dashed var(--line);
      border-radius: var(--r-card);
      color: var(--muted);
      text-align: center;
    }

    .box i { font-size: 2rem; }
  `,
})
export class AsyncStateComponent {
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly emptyKey = input('app.common.empty');
  readonly retry = output<void>();
}
