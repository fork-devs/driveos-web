import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LangSwitchComponent } from '../../shared/lang-switch.component';
import { LogoComponent } from '../../shared/logo.component';

/** Shared frame for sign-in, sign-up and password recovery: form on the left, brand panel on the right. */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe, LangSwitchComponent, LogoComponent],
  template: `
    <div class="shell">
      <div class="side">
        <header class="top">
          <a class="brand" routerLink="/" [attr.aria-label]="'nav.home' | transloco">
            <app-logo class="mark" />
            <span>DriveOS</span>
          </a>
          <app-lang-switch />
        </header>

        <main class="content">
          <ng-content />
        </main>

        <a class="back" routerLink="/">
          <i class="ph ph-arrow-left" aria-hidden="true"></i>
          {{ 'auth.common.back' | transloco }}
        </a>
      </div>

      <aside class="panel" aria-hidden="true">
        <app-logo class="big" />
        <p>{{ 'hero.title' | transloco }}</p>
      </aside>
    </div>
  `,
  styles: `
    .shell { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 100dvh; }

    .side {
      display: flex;
      flex-direction: column;
      gap: 32px;
      padding: 24px var(--gutter) 32px;
    }

    .top { display: flex; align-items: center; justify-content: space-between; }

    .brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.2rem; letter-spacing: -0.03em; }
    .mark { height: 30px; color: var(--c-primary); }

    .content { width: 100%; max-width: 420px; margin: auto; }

    .back { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-weight: 550; }
    .back:hover { color: var(--fg); }

    .panel {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: clamp(32px, 5vw, 64px);
      background:
        linear-gradient(rgb(0 113 235 / 0.84), rgb(0 113 235 / 0.84)),
        url('/brand/pattern-blue.png') center / 360px auto repeat,
        var(--c-primary);
      color: var(--c-white);
    }

    .big { height: clamp(120px, 22vh, 200px); color: var(--c-white); }

    .panel p {
      max-width: 14ch;
      font-size: clamp(2rem, 3.6vw, 3.4rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1.04;
    }

    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .panel { display: none; }
    }
  `,
})
export class AuthLayoutComponent {}
