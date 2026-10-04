import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService, errorKey } from '../../core/auth/auth.service';
import { AuthFieldComponent } from './auth-field.component';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthLayoutComponent, AuthFieldComponent, ReactiveFormsModule, RouterLink, TranslocoPipe],
  styleUrl: './auth-form.scss',
  template: `
    <app-auth-layout>
      <h1>{{ 'auth.forgot.title' | transloco }}</h1>
      <p class="sub">{{ 'auth.forgot.sub' | transloco }}</p>

      @if (done()) {
        <p class="ok" role="status">
          <i class="ph ph-check-circle" aria-hidden="true"></i>{{ 'auth.forgot.success' | transloco }}
        </p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate [attr.aria-busy]="loading()">
          @if (error(); as e) {
            <p class="alert" role="alert">
              <i class="ph ph-warning-circle" aria-hidden="true"></i>{{ 'auth.errors.' + e | transloco }}
            </p>
          }
          <app-auth-field fieldId="fp-email" label="auth.fields.email" type="email" auto="email" [control]="form.controls.email" />
          <button class="btn btn-primary" type="submit" [disabled]="loading()">
            {{ (loading() ? 'auth.common.loading' : 'auth.forgot.submit') | transloco }}
          </button>
        </form>
      }

      <p class="links"><a routerLink="/sign-in">{{ 'auth.forgot.back' | transloco }}</a></p>
    </app-auth-layout>
  `,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly loading = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.requestPasswordReset(this.form.controls.email.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
      },
      error: (err) => {
        this.error.set(errorKey(err));
        this.loading.set(false);
      },
    });
  }
}
