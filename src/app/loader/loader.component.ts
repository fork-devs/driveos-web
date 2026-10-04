import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  output,
  signal,
} from '@angular/core';
import { SceneService } from '../scene/scene.service';
import { LOGO_PARTS, LOGO_VIEWBOX } from '../shared/logo-paths';

const LOADER_DURATION_MS = 2200;
/** Never wait longer than this for fonts / three.js, so a slow or blocked asset cannot freeze the intro. */
const PRELOAD_TIMEOUT_MS = 3000;
const SEEN_KEY = 'driveos.intro-seen';
const REDUCED_DURATION_MS = 300;

/**
 * DriveOS Precision Intro Loader:
 * - 100% Distortion-Free, zero-lag GPU-accelerated Hat Toss & 360° Spin.
 * - Exact SVG coordinate pinning (no path coordinate overwrites or non-uniform scaling).
 * - Smooth brand reveal and silk-smooth curtain glide into Sign In.
 */
@Component({
  selector: 'app-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (!gone()) {
      <div
        class="loader-overlay"
        role="status"
        aria-live="polite"
        [class.leaving]="leaving()"
      >
        <!-- Background Curtains -->
        <div class="curtain curtain-blue" aria-hidden="true"></div>
        <div class="curtain curtain-dark" aria-hidden="true">
          <!-- Stage: Logo + Brand Title -->
          <div class="stage-container" [class.ascend]="phase() === 'ascend'">
            <!-- SVG Logo: Body + Isolated Hat Pivot -->
            <div class="logo-wrapper">
              <svg class="logo-svg" [attr.viewBox]="viewBox" aria-hidden="true">
                <!-- Static Body and Eyes (Fixed coordinates, never altered) -->
                @for (p of staticParts; track p.id) {
                  <path
                    class="logo-part"
                    [attr.d]="p.d"
                    [attr.transform]="'translate(' + p.x + ' ' + p.y + ')'"
                  />
                }

                <!-- Hat Group with exact SVG origin (548px, 274px) -->
                @if (hatPart; as hat) {
                  <g class="hat-launcher">
                    <path
                      class="logo-part"
                      [attr.d]="hat.d"
                      [attr.transform]="'translate(' + hat.x + ' ' + hat.y + ')'"
                    />
                  </g>
                }
              </svg>
            </div>

            <!-- Brand Title Revealed smoothly -->
            <div class="title-reveal" [class.visible]="showTitle()">
              <h1 class="brand-title">
                <span class="word-drive">Drive</span><span class="word-os">OS</span>
              </h1>
              <p class="brand-caption">Intelligent Workshop Platform</p>
            </div>
          </div>

          <!-- Minimalist Loading Indicator -->
          <div class="progress-track" aria-hidden="true" [class.hidden]="showTitle()">
            <div class="progress-bar"></div>
          </div>

          <span class="sr-only">{{ label }}</span>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .loader-overlay {
      position: fixed;
      inset: 0;
      z-index: var(--z-loader, 9999);
      pointer-events: all;
      user-select: none;
    }

    .curtain {
      position: absolute;
      inset: 0;
      will-change: transform;
      transform: translate3d(0, 0, 0);
      transition: transform 0.75s cubic-bezier(0.77, 0, 0.175, 1);
    }

    .curtain-blue {
      background:
        linear-gradient(rgba(0, 113, 235, 0.9), rgba(0, 113, 235, 0.9)),
        url('/brand/pattern-blue.png') center / 380px auto repeat,
        var(--c-primary, #0071eb);
      transition-delay: 0.08s;
    }

    .curtain-dark {
      display: grid;
      place-items: center;
      background: #0d1117;
      overflow: hidden;
    }

    .leaving .curtain {
      transform: translate3d(0, -100%, 0);
    }

    .leaving .curtain-blue {
      transition-delay: 0.12s;
    }

    /* Central Stage */
    .stage-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      will-change: transform, opacity;
      transform: translate3d(0, 0, 0);
      transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;

      &.ascend {
        transform: translate3d(0, -24px, 0);
      }
    }

    .logo-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 12px 28px rgba(0, 113, 235, 0.3));
    }

    .logo-svg {
      height: clamp(130px, 20vh, 180px);
      width: auto;
      overflow: visible;
    }

    .logo-part {
      fill: var(--c-primary, #0071eb);
      stroke: #ffffff;
      stroke-width: 8;
      stroke-linejoin: round;
    }

    /* Precision SVG Hat Toss & 360° Spin: Fixed Pivot at Exact Center of Hat (548px, 274px) */
    .hat-launcher {
      transform-origin: 548px 274px;
      animation: hatTossAndSpin 1.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      will-change: transform;
    }

    @keyframes hatTossAndSpin {
      0% { transform: translateY(0) rotate(0deg); }
      15% { transform: translateY(6px) rotate(-4deg); }
      50% { transform: translateY(-220px) rotate(-180deg); }
      80% { transform: translateY(0) rotate(-360deg); }
      90% { transform: translateY(-8px) rotate(-360deg); }
      100% { transform: translateY(0) rotate(-360deg); }
    }

    /* Brand Typography Reveal */
    .title-reveal {
      text-align: center;
      opacity: 0;
      will-change: opacity, transform;
      transform: translate3d(0, 12px, 0);
      transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);

      &.visible {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    .brand-title {
      font-size: clamp(2.2rem, 4vw, 2.8rem);
      font-weight: 850;
      letter-spacing: -0.04em;
      line-height: 1;
      color: #ffffff;
      margin: 0;
      text-shadow: 0 4px 18px rgba(0, 113, 235, 0.35);

      .word-drive { color: #ffffff; }
      .word-os { color: #38bdf8; margin-left: 2px; }
    }

    .brand-caption {
      margin-top: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.55);
    }

    /* Minimalist Loading Bar */
    .progress-track {
      position: absolute;
      left: 50%;
      bottom: clamp(32px, 7vh, 64px);
      width: min(160px, 36vw);
      height: 3px;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.1);
      border-radius: 9999px;
      overflow: hidden;
      transition: opacity 0.3s ease;

      &.hidden {
        opacity: 0;
      }
    }

    .progress-bar {
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #0071eb, #38bdf8);
      border-radius: 9999px;
      transform-origin: left;
      animation: progressGrow 1.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes progressGrow {
      0% { transform: scaleX(0); }
      70% { transform: scaleX(0.8); }
      100% { transform: scaleX(1); }
    }
  `,
})
export class LoaderComponent {
  readonly finished = output<void>();

  protected readonly parts = LOGO_PARTS;
  protected readonly viewBox = LOGO_VIEWBOX;
  protected readonly label = 'DriveOS';

  protected readonly hatPart = LOGO_PARTS.find((p) => p.id === 'hat');
  protected readonly staticParts = LOGO_PARTS.filter((p) => p.id !== 'hat');

  protected readonly showTitle = signal(false);
  protected readonly phase = signal<'initial' | 'landed' | 'ascend'>('initial');
  protected readonly leaving = signal(false);
  protected readonly gone = signal(false);

  private readonly scene = inject(SceneService);
  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // The intro plays once per browser session; reloads go straight to the app.
    if (this.alreadySeen()) {
      this.gone.set(true);
      return;
    }
    afterNextRender(() => void this.run());
  }

  private alreadySeen(): boolean {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return true;
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* storage blocked: play the intro */
    }
    return false;
  }

  private async run(): Promise<void> {
    const body = this.doc.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;

    this.destroyRef.onDestroy(() => {
      cancelled = true;
      body.style.overflow = prevOverflow;
    });

    const preloadPromise = Promise.race([
      Promise.allSettled([
        this.doc.fonts?.load('700 1em "Figtree Variable"') ?? Promise.resolve(),
        this.scene.preload().catch(() => null),
      ]),
      new Promise((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS)),
    ]);

    if (!reduced) {
      // Milestone 1: Hat touches down (~1.2s) -> reveal title
      setTimeout(() => {
        if (!cancelled) {
          this.showTitle.set(true);
          this.phase.set('landed');
        }
      }, 1200);

      // Milestone 2: Subtle upward transition (~1.65s)
      setTimeout(() => {
        if (!cancelled) {
          this.phase.set('ascend');
        }
      }, 1650);

      // Milestone 3: Curtains open smoothly (~2.1s)
      setTimeout(() => {
        if (cancelled) return;
        
        // Remove await preloadPromise here to prevent the UI from getting stuck ("se traba")
        this.leaving.set(true);
        body.style.overflow = prevOverflow;

        setTimeout(() => {
          if (!cancelled) {
            this.finished.emit();
          }
        }, 250);

        setTimeout(() => {
          if (!cancelled) {
            this.gone.set(true);
          }
        }, 800);
      }, LOADER_DURATION_MS);
    } else {
      this.showTitle.set(true);
      await preloadPromise;
      setTimeout(() => {
        if (!cancelled) {
          this.leaving.set(true);
          body.style.overflow = prevOverflow;
          this.finished.emit();
          setTimeout(() => this.gone.set(true), 80);
        }
      }, REDUCED_DURATION_MS);
    }
  }
}
