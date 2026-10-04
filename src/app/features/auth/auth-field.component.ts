import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

/** Label above, input, error below. Password fields get a show/hide toggle. */
@Component({
  selector: 'app-auth-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  template: `
    <div class="field">
      <label [for]="fieldId()">{{ label() | transloco }}</label>
      <div class="control">
        <input
          [id]="fieldId()"
          [type]="type() === 'password' && shown() ? 'text' : type()"
          [formControl]="control()"
          [attr.autocomplete]="auto()"
          [attr.aria-invalid]="invalid()"
          [attr.aria-describedby]="invalid() ? fieldId() + '-error' : null"
        />
        @if (type() === 'password') {
          <button
            type="button"
            class="eye"
            [attr.aria-label]="(shown() ? 'auth.common.hide' : 'auth.common.show') | transloco"
            [attr.aria-pressed]="shown()"
            (click)="shown.set(!shown())"
          >
            <i [class]="'ph ' + (shown() ? 'ph-eye-slash' : 'ph-eye')" aria-hidden="true"></i>
          </button>
        }
      </div>
      @if (invalid()) {
        <p class="error" [id]="fieldId() + '-error'">{{ errorKey() | transloco }}</p>
      }
    </div>
  `,
  styles: `
    .field { display: grid; gap: 8px; }

    label { font-weight: 650; font-size: 0.95rem; }

    .control { position: relative; }

    input {
      width: 100%;
      height: 52px;
      padding: 0 16px;
      border: 1.5px solid var(--line);
      border-radius: var(--r-field);
      background: var(--card);
      color: var(--fg);
      font: inherit;
      transition: border-color 0.2s var(--ease-out);
    }

    input[type='password'], input[type='text'][autocomplete*='password'] { padding-right: 52px; }

    input:hover { border-color: var(--muted); }
    input:focus-visible { outline: 3px solid var(--focus); outline-offset: 1px; border-color: var(--focus); }
    input[aria-invalid='true'] { border-color: var(--c-red); }

    .eye {
      position: absolute;
      top: 50%;
      right: 6px;
      width: 40px;
      height: 40px;
      transform: translateY(-50%);
      border: 0;
      border-radius: var(--r-pill);
      background: transparent;
      color: var(--muted);
      font-size: 1.3rem;
      display: grid;
      place-items: center;
    }

    .eye:hover { color: var(--fg); }

    .error { font-size: 0.9rem; font-weight: 550; color: #b00f1d; }

    @media (prefers-color-scheme: dark) { .error { color: #ff7a85; } }
  `,
})
export class AuthFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly auto = input<string>('off');

  protected readonly shown = signal(false);
  private readonly tick = signal(0);

  constructor() {
    // The control lives outside this component, so re-check whenever its state changes.
    effect((onCleanup) => {
      const sub = this.control().events.subscribe(() => this.tick.update((n) => n + 1));
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected readonly invalid = computed(() => {
    this.tick();
    const c = this.control();
    return c.invalid && (c.touched || c.dirty);
  });

  protected readonly errorKey = computed(() => {
    this.tick();
    const e = this.control().errors ?? {};
    if (e['required']) return 'auth.errors.required';
    if (e['email']) return 'auth.errors.email';
    if (e['minlength']) return 'auth.errors.minlength';
    return 'auth.errors.generic';
  });
}
