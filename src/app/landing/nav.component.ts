import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LangSwitchComponent } from '../shared/lang-switch.component';
import { LogoComponent } from '../shared/logo.component';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';

interface NavLink {
  id: string;
  key: string;
}

@Component({
  selector: 'app-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe, LogoComponent, LangSwitchComponent, ThemeToggleComponent],
  template: `
    <header class="nav" [class.scrolled]="scrolled()" [class.open]="open()">
      <div class="wrap bar">
        <a class="brand" href="#top" [attr.aria-label]="'nav.home' | transloco" (click)="open.set(false)">
          <app-logo class="mark" />
          <div class="brand-name-wrap">
            <span class="brand-title">DriveOS</span>
            <span class="brand-tag">Atelier Platform</span>
          </div>
        </a>

        <nav class="links" [attr.aria-label]="'DriveOS'">
          @for (l of links; track l.id) {
            <a [href]="'#' + l.id" (click)="open.set(false)">{{ l.key | transloco }}</a>
          }
        </nav>

        <div class="tools">
          <app-lang-switch />
          <app-theme-toggle />
          <a class="login" routerLink="/sign-in">{{ 'nav.login' | transloco }}</a>
          <a class="btn btn-primary cta" href="#demo" (click)="open.set(false)">{{ 'nav.cta' | transloco }}</a>
          <button
            type="button"
            class="burger"
            [attr.aria-expanded]="open()"
            aria-controls="nav-panel"
            aria-label="Menu"
            (click)="open.set(!open())"
          >
            <i class="ph" [class.ph-list]="!open()" [class.ph-x]="open()"></i>
          </button>
        </div>
      </div>

      <div id="nav-panel" class="panel">
        @for (l of links; track l.id) {
          <a [href]="'#' + l.id" (click)="open.set(false)">{{ l.key | transloco }}</a>
        }
        <div style="display: flex; gap: 10px; padding: 12px 0;">
          <app-lang-switch />
          <app-theme-toggle />
        </div>
        <a routerLink="/sign-in" style="font-weight: 700; color: var(--c-primary);">{{ 'nav.login' | transloco }}</a>
      </div>
    </header>
  `,
  styles: `
    .nav {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: var(--z-nav);
      background: color-mix(in srgb, var(--card-glass) 92%, transparent);
      border-bottom: 1px solid transparent;
      backdrop-filter: blur(16px);
      transition: border-color 0.3s var(--ease-out), background-color 0.3s var(--ease-out);
    }

    .nav.scrolled, .nav.open { border-bottom-color: var(--line); }

    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      height: var(--nav-h);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--fg);
    }

    .mark { height: 34px; color: var(--c-primary); }

    .brand-name-wrap {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-title {
      font-weight: 850;
      font-size: 1.25rem;
      letter-spacing: -0.03em;
    }

    .brand-tag {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--c-primary-text);
    }

    .links { display: flex; align-items: center; gap: 24px; margin-inline: auto; }

    .links a {
      font-weight: 600;
      font-size: 0.94rem;
      color: var(--muted);
      transition: color 0.2s var(--ease-out);
      &:hover { color: var(--fg); }
    }

    .tools { display: flex; align-items: center; gap: 10px; }

    .login {
      font-weight: 650;
      font-size: 0.94rem;
      padding: 8px 6px;
      transition: color 0.2s var(--ease-out);
      &:hover { color: var(--c-primary); }
    }

    .cta { min-height: 38px; padding: 0 18px; font-size: 0.9rem; }

    .burger {
      display: none;
      width: 38px;
      height: 38px;
      border: 1px solid var(--line);
      border-radius: var(--r-pill);
      background: transparent;
      font-size: 1.2rem;
    }

    .panel { display: none; }

    @media (max-width: 960px) {
      .links { display: none; }
      .burger { display: inline-grid; place-items: center; }
      .cta, .login { display: none; }

      .panel {
        display: grid;
        gap: 4px;
        padding: 8px var(--gutter) 20px;
        max-height: 0;
        overflow: hidden;
        visibility: hidden;
        background: var(--card);
        border-bottom: 1px solid var(--line);
        transition: max-height 0.4s var(--ease-out);
      }

      .open .panel { max-height: 360px; visibility: visible; }

      .panel a {
        padding: 10px 0;
        font-weight: 600;
        font-size: 1.05rem;
        border-bottom: 1px solid var(--line);
      }
    }
  `,
})
export class NavComponent {
  protected readonly links: NavLink[] = [
    { id: 'how', key: 'nav.how' },
    { id: 'features', key: 'nav.features' },
    { id: 'roles', key: 'nav.roles' },
    { id: 'plans', key: 'nav.plans' },
  ];
  protected readonly scrolled = signal(false);
  protected readonly open = signal(false);

  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const sentinel = this.doc.getElementById('top');
      if (!sentinel) return;
      const io = new IntersectionObserver(([e]) => this.scrolled.set(!e.isIntersecting));
      io.observe(sentinel);
      this.destroyRef.onDestroy(() => io.disconnect());
    });
  }
}
