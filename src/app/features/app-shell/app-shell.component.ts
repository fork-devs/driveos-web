import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../core/auth/auth.service';
import { OfflineSyncService } from '../../core/offline/offline-sync.service';
import { branches } from '../../core/api/mock-data';
import { Branch } from '../../domain/models';
import { LangSwitchComponent } from '../../shared/lang-switch.component';
import { LogoComponent } from '../../shared/logo.component';
import { ThemeToggleComponent } from '../../shared/theme-toggle.component';

interface NavItem {
  path: string;
  key: string;
  icon: string;
}

const MANAGER_NAV: NavItem[] = [
  { path: 'overview', key: 'overview', icon: 'ph-squares-four' },
  { path: 'orders', key: 'orders', icon: 'ph-clipboard-text' },
  { path: 'telemetry', key: 'alerts', icon: 'ph-broadcast' },
  { path: 'inventory', key: 'inventory', icon: 'ph-package' },
  { path: 'billing', key: 'billing', icon: 'ph-receipt' },
  { path: 'agenda', key: 'agenda', icon: 'ph-calendar-blank' },
];

const TECHNICIAN_NAV: NavItem[] = [
  { path: 'tasks', key: 'tasks', icon: 'ph-wrench' },
  { path: 'telemetry', key: 'alerts', icon: 'ph-broadcast' },
  { path: 'agenda', key: 'agenda', icon: 'ph-calendar-blank' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
    LangSwitchComponent,
    LogoComponent,
    ThemeToggleComponent,
    MatMenuModule,
    MatRippleModule,
    MatTooltipModule,
  ],
  template: `
    <div class="app">
      <!-- Barra lateral de navegación (Steep Rail Architecture) -->
      <aside class="rail">
        <div class="rail-top">
          <div class="brand-row">
            <a class="brand" routerLink="/app">
              <app-logo class="mark" />
              <div class="brand-text">
                <span class="brand-name">DriveOS</span>
                <span class="brand-sub">Platform</span>
              </div>
            </a>
          </div>

          <!-- Selector de Sede Personalizado (Steep Custom Dropdown) -->
          <div class="branch-card-container">
            <button
              type="button"
              class="branch-trigger"
              [matMenuTriggerFor]="branchMenu"
              #branchTrigger="matMenuTrigger"
              [class.open]="branchTrigger.menuOpen"
              aria-label="Cambiar sede de taller"
            >
              <div class="branch-icon-box">
                <i class="ph ph-buildings"></i>
              </div>
              <div class="branch-meta">
                <span class="branch-label">Sede Activa</span>
                <strong class="branch-name">{{ selectedBranch().name }}</strong>
              </div>
              <i class="ph ph-caret-down branch-chev" [class.rotated]="branchTrigger.menuOpen"></i>
            </button>

            <mat-menu #branchMenu="matMenu" class="branch-menu" xPosition="before">
              <div class="popover-header" (click)="$event.stopPropagation()">
                <span>Seleccionar sucursal</span>
              </div>
              @for (b of allBranches; track b.id) {
                <button mat-menu-item (click)="selectBranch(b)" [class.active]="selectedBranch().id === b.id">
                  <div class="option-content">
                    <strong>{{ b.name }}</strong>
                    <small>{{ b.address }} · {{ b.activeBays }} bahías</small>
                  </div>
                  @if (selectedBranch().id === b.id) {
                    <i class="ph ph-check-circle option-check"></i>
                  }
                </button>
              }
            </mat-menu>
          </div>
        </div>

        <!-- Enlaces de Navegación -->
        <nav class="nav" aria-label="Menú de Navegación">
          @for (i of items(); track i.path) {
            <a matRipple [routerLink]="i.path" routerLinkActive="active">
              <i [class]="'ph ' + i.icon" aria-hidden="true"></i>
              <span class="nav-label">{{ 'app.nav.' + i.key | transloco }}</span>
            </a>
          }
        </nav>

        <!-- Tarjeta de Perfil de Usuario Rediseñada (Steep Editorial User Card) -->
        <div class="user-card">
          <div class="who-row">
            <div class="avatar-bubble" [title]="profile()?.name">
              {{ getInitials(profile()?.name) }}
            </div>
            <div class="user-details">
              <span class="user-name" [title]="profile()?.name">{{ profile()?.name }}</span>
              <span class="user-role">{{ 'app.role.' + profile()?.role | transloco }}</span>
            </div>
          </div>

          <div class="user-tools-bar">
            <app-lang-switch />
            <div class="actions-right">
              <app-theme-toggle />
              <button class="signout-btn" type="button" (click)="signOut()" matTooltip="Cerrar sesión" aria-label="Cerrar sesión">
                <i class="ph ph-sign-out" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Contenedor de Contenido Principal -->
      <main class="main">
        <!-- Banners de Sincronización Offline -->
        @if (!sync.online()) {
          <div class="banner offline" role="status">
            <i class="ph ph-wifi-slash"></i>
            <span>Sin conexión a internet. Los cambios se guardan localmente y se enviarán automáticamente.</span>
            @if (sync.pending().length) {
              <strong>({{ sync.pending().length }} pendientes)</strong>
            }
          </div>
        } @else if (sync.syncing() || sync.pending().length) {
          <div class="banner syncing" role="status">
            <i class="ph ph-arrows-clockwise"></i>
            <span>Sincronizando cambios con el API Gateway ({{ sync.pending().length }} en cola)...</span>
          </div>
        }

        <div class="stage">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: `
    .app {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      min-height: 100dvh;
      background: var(--bg);
    }

    .rail {
      position: sticky;
      top: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100dvh;
      padding: 20px 16px;
      border-right: 1px solid var(--line);
      background: var(--card);
      z-index: 25;
    }

    .rail-top {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-inline: 4px;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .mark { height: 32px; color: var(--c-primary); }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-name {
      font-weight: 850;
      font-size: 1.2rem;
      letter-spacing: -0.03em;
      color: var(--c-ink);
    }

    .brand-sub {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    /* Branch Dropdown */
    .branch-card-container {
      position: relative;
    }

    .branch-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--r-field);
      background: var(--card-nested);
      border: 1px solid var(--line);
      text-align: left;
      cursor: pointer;
      transition: all 0.2s var(--ease-out);

      &:hover {
        border-color: var(--line-strong);
        background: color-mix(in srgb, var(--card-nested) 80%, var(--card));
      }

      &.open {
        border-color: var(--c-primary);
        box-shadow: 0 0 0 1px var(--c-primary);
      }
    }

    .branch-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: color-mix(in srgb, var(--c-primary) 12%, transparent);
      color: var(--c-primary);
      display: grid;
      place-items: center;
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .branch-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .branch-label {
      font-size: 0.68rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 650;
    }

    .branch-name {
      font-size: 0.86rem;
      color: var(--fg);
      font-weight: 750;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .branch-chev {
      font-size: 0.95rem;
      color: var(--muted);
      transition: transform 0.25s var(--ease-out);
      flex-shrink: 0;

      &.rotated { transform: rotate(180deg); }
    }

    .popover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-width: 260px;
      padding: 8px 16px 10px;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .active { background: color-mix(in srgb, var(--c-primary) 10%, transparent); }

    .option-content {
      display: flex;
      flex-direction: column;
      line-height: 1.25;

      strong { font-size: 0.84rem; color: var(--fg); }
      small { font-size: 0.74rem; color: var(--muted); }
    }

    .bay-tag {
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--c-primary);
      margin-top: 2px;
    }

    .option-check {
      font-size: 1.2rem;
      color: var(--c-primary);
      flex-shrink: 0;
    }

    /* Navigation */
    .nav {
      display: grid;
      gap: 4px;
      overflow-y: auto;
    }

    .nav a {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 42px;
      padding: 0 12px;
      border-radius: var(--r-field);
      font-weight: 600;
      font-size: 0.88rem;
      color: var(--muted);
      transition: all 0.2s var(--ease-out);

      i { font-size: 1.25rem; }

      &:hover {
        color: var(--fg);
        background: var(--card-nested);
      }

      &.active {
        background: var(--c-ink);
        color: var(--c-paper);

        .nav-bc-tag {
          background: color-mix(in srgb, var(--c-paper) 22%, transparent);
          color: var(--c-paper);
        }
      }
    }

    .nav-label { flex: 1; }

    .nav-bc-tag {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--r-pill);
      background: color-mix(in srgb, var(--fg) 8%, transparent);
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* Steep User Profile Footer Card */
    .user-card {
      margin-top: auto;
      padding: 12px 14px;
      border-radius: var(--r-card);
      background: var(--card-nested);
      border: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .who-row {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .avatar-bubble {
      width: 36px;
      height: 36px;
      border-radius: 9999px;
      background: var(--c-peach);
      color: var(--c-sienna);
      font-weight: 800;
      font-size: 0.82rem;
      letter-spacing: 0.02em;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      border: 1px solid rgba(93, 42, 26, 0.12);
    }

    .user-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
      line-height: 1.2;
    }

    .user-name {
      font-size: 0.84rem;
      font-weight: 750;
      color: var(--fg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.72rem;
      color: var(--muted);
      font-weight: 550;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-tools-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding-top: 8px;
      border-top: 1px solid var(--line);
    }

    .actions-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .signout-btn {
      width: 30px;
      height: 30px;
      border-radius: var(--r-pill);
      border: 1px solid var(--line);
      background: transparent;
      color: var(--muted);
      display: grid;
      place-items: center;
      font-size: 1.05rem;
      cursor: pointer;
      transition: all 0.15s var(--ease-out);

      &:hover {
        border-color: var(--c-red);
        color: var(--c-red);
        background: color-mix(in srgb, var(--c-red) 8%, transparent);
      }
    }

    .main {
      min-width: 0;
      padding: clamp(20px, 3vw, 40px);
    }

    /* Named so the route transition animates only this pane (see styles.scss). */
    .stage {
      view-transition-name: stage;
      min-height: 60vh;
      background: var(--bg);
    }

    .banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: var(--r-field);
      font-size: 0.88rem;
      font-weight: 550;
      margin-bottom: 20px;

      &.offline {
        background: var(--c-peach);
        color: var(--c-sienna);
        border: 1px solid rgba(93, 42, 26, 0.2);
      }

      &.syncing {
        background: color-mix(in srgb, var(--c-primary) 12%, var(--card));
        color: var(--c-primary);
        border: 1px solid var(--c-primary);
      }
    }

    @media (max-width: 960px) {
      .app { grid-template-columns: 1fr; padding-bottom: 76px; }

      .rail {
        position: static;
        height: auto;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 12px var(--gutter);
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }

      .branch-card-container { display: none; }
      .user-card { display: none; }

      .nav {
        position: fixed;
        inset: auto 0 0 0;
        z-index: var(--z-nav);
        display: flex;
        justify-content: space-around;
        gap: 0;
        padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
        background: var(--card-glass);
        backdrop-filter: blur(16px);
        border-top: 1px solid var(--line);

        a {
          flex: 1;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
          min-height: 52px;
          padding: 4px;
          font-size: 0.7rem;
          text-align: center;

          i { font-size: 1.35rem; }
        }

        .nav-bc-tag { display: none; }
      }
    }
  `,
})
export class AppShellComponent {
  protected readonly sync = inject(OfflineSyncService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly allBranches = branches;
  protected readonly selectedBranch = signal<Branch>(branches[0]);

  protected readonly profile = this.auth.profile;
  protected readonly items = computed(() =>
    this.auth.role() === 'technician' ? TECHNICIAN_NAV : MANAGER_NAV,
  );

  protected selectBranch(b: Branch): void {
    this.selectedBranch.set(b);
  }

  protected getInitials(name?: string): string {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/');
  }
}
