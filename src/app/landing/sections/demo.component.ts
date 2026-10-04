import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/reveal.directive';

/**
 * Demo request form. The backend does not exist yet, so submit only marks the form as sent.
 * When the API is ready, replace onSubmit with a call through the gateway client.
 */
@Component({
  selector: 'app-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe, RevealDirective],
  template: `
    <section id="demo" class="demo">
      <div class="wrap layout">
        <div class="copy" appReveal>
          <h2>{{ 'demo.title' | transloco }}</h2>
          <p>{{ 'demo.sub' | transloco }}</p>
        </div>

        <div class="card" appReveal="1">
          @if (sent()) {
            <div class="done" role="status">
              <i class="ph ph-check-circle" aria-hidden="true"></i>
              <p>{{ 'demo.success' | transloco }}</p>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
              @for (f of fields; track f.name) {
                <div class="field">
                  <label [for]="'f-' + f.name">{{ 'demo.' + f.name | transloco }}</label>
                  <input
                    [id]="'f-' + f.name"
                    [type]="f.type"
                    [formControlName]="f.name"
                    [autocomplete]="f.auto"
                    [attr.aria-invalid]="invalid(f.name)"
                    [attr.aria-describedby]="invalid(f.name) ? 'e-' + f.name : null"
                  />
                  @if (invalid(f.name)) {
                    <p class="error" [id]="'e-' + f.name">
                      {{ (form.controls[f.name].hasError('email') ? 'demo.errorEmail' : 'demo.errorRequired') | transloco }}
                    </p>
                  }
                </div>
              }
              <button class="btn btn-primary" type="submit">{{ 'demo.submit' | transloco }}</button>
            </form>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .demo {
      padding-block: clamp(80px, 12vw, 160px);
      background:
        linear-gradient(rgb(0 113 235 / 0.84), rgb(0 113 235 / 0.84)),
        url('/brand/pattern-blue.png') center / 400px auto repeat,
        var(--c-primary);
      color: var(--c-white);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
      gap: clamp(32px, 6vw, 96px);
      align-items: center;
    }

    h2 { font-size: clamp(2.3rem, 5vw, 4.2rem); font-weight: 800; letter-spacing: -0.04em; margin-bottom: 20px; }
    .copy p { max-width: 40ch; font-size: 1.2rem; color: #e6f0ff; }

    .card {
      padding: clamp(24px, 3vw, 40px);
      border-radius: var(--r-card);
      background: var(--card);
      color: var(--fg);
      box-shadow: 0 24px 60px -24px rgb(3 26 107 / 0.55);
    }

    form { display: grid; gap: 20px; }

    .field { display: grid; gap: 8px; }

    label { font-weight: 650; font-size: 0.95rem; }

    input {
      height: 52px;
      padding: 0 16px;
      border: 1.5px solid var(--line);
      border-radius: var(--r-field);
      background: var(--bg);
      color: var(--fg);
      font: inherit;
      transition: border-color 0.2s var(--ease-out);
    }

    input:hover { border-color: var(--muted); }
    input:focus-visible { outline: 3px solid var(--focus); outline-offset: 1px; border-color: var(--focus); }
    input[aria-invalid='true'] { border-color: var(--c-red); }

    .error { font-size: 0.9rem; font-weight: 550; color: #b00f1d; }

    .btn { justify-self: start; }

    .done { display: flex; align-items: center; gap: 14px; padding-block: 12px; }
    .done i { font-size: 2.4rem; color: var(--c-primary); flex: none; }
    .done p { font-size: 1.15rem; font-weight: 600; }

    @media (prefers-color-scheme: dark) {
      .error { color: #ff7a85; }
    }

    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
    }
  `,
})
export class DemoComponent {
  private readonly fb = inject(FormBuilder);

  protected readonly fields = [
    { name: 'name', type: 'text', auto: 'name' },
    { name: 'email', type: 'email', auto: 'email' },
    { name: 'workshop', type: 'text', auto: 'organization' },
  ] as const;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    workshop: ['', Validators.required],
  });

  protected readonly sent = signal(false);

  protected invalid(name: 'name' | 'email' | 'workshop'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sent.set(true);
  }
}
