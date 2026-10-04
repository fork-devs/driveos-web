import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService, errorKey } from '../../core/auth/auth.service';
import { AuthFieldComponent } from './auth-field.component';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-sign-in',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthLayoutComponent, AuthFieldComponent, ReactiveFormsModule, RouterLink, TranslocoPipe],
  styleUrl: './auth-form.scss',
  template: `
    <app-auth-layout>
      <h1>{{ 'auth.signIn.title' | transloco }}</h1>
      <p class="sub">{{ 'auth.signIn.sub' | transloco }}</p>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate [attr.aria-busy]="loading()">
        @if (error(); as e) {
          <p class="alert" role="alert">
            <i class="ph ph-warning-circle" aria-hidden="true"></i>{{ 'auth.errors.' + e | transloco }}
          </p>
        }
        <app-auth-field fieldId="si-email" label="auth.fields.email" type="email" auto="email" [control]="form.controls.email" />
        <app-auth-field fieldId="si-password" label="auth.fields.password" type="password" auto="current-password" [control]="form.controls.password" />
        <button class="btn btn-primary" type="submit" [disabled]="loading()">
          {{ (loading() ? 'auth.common.loading' : 'auth.signIn.submit') | transloco }}
        </button>
      </form>

      <p class="links">
        <a routerLink="/forgot-password">{{ 'auth.signIn.forgot' | transloco }}</a>
        <span>{{ 'auth.signIn.noAccount' | transloco }} <a routerLink="/sign-up">{{ 'auth.signIn.create' | transloco }}</a></span>
      </p>
    </app-auth-layout>
  `,
})
export class SignInPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.signIn(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl('/app'),
      error: (err) => {
        this.error.set(errorKey(err));
        this.loading.set(false);
      },
    });
  }
}
