import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HeroSceneComponent } from '../../scene/hero-scene.component';

@Component({
  selector: 'app-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, HeroSceneComponent],
  template: `
    <section class="hero" [class.in]="play()">
      <div class="wrap grid">
        <div class="copy">
          <h1 class="rise" style="--i: 0">{{ 'hero.title' | transloco }}</h1>
          <p class="sub rise" style="--i: 1">{{ 'hero.sub' | transloco }}</p>
          <div class="actions rise" style="--i: 2">
            <a class="btn btn-primary" href="#demo">{{ 'hero.cta' | transloco }}</a>
            <a class="btn btn-quiet" href="#how">
              {{ 'hero.secondary' | transloco }}
              <i class="ph ph-arrow-right" aria-hidden="true"></i>
            </a>
          </div>
        </div>
        <div class="scene rise" style="--i: 1">
          <app-hero-scene [play]="play()" [label]="'hero.sceneLabel' | transloco" />
        </div>
      </div>
    </section>
  `,
  styles: `
    .hero {
      position: relative;
      min-height: 100dvh;
      padding-top: calc(var(--nav-h) + 32px);
      display: flex;
      align-items: center;
      overflow: hidden;
    }

    /* Brand pattern as a faint texture behind the 3D mark */
    .hero::before {
      content: '';
      position: absolute;
      inset: 0 0 0 42%;
      background: url('/brand/pattern-blue.png') center / 360px auto repeat;
      opacity: 0.1;
      -webkit-mask-image: radial-gradient(closest-side at 55% 50%, #000 30%, transparent 100%);
      mask-image: radial-gradient(closest-side at 55% 50%, #000 30%, transparent 100%);
      pointer-events: none;
    }

    .grid {
      position: relative;
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      align-items: center;
      gap: clamp(16px, 3vw, 48px);
      padding-block: 24px 48px;
    }

    .copy { display: grid; gap: 24px; justify-items: start; }

    h1 { font-size: clamp(2.3rem, 4.7vw, 4.1rem); font-weight: 800; letter-spacing: -0.04em; }

    .sub { max-width: 46ch; font-size: clamp(1.05rem, 1.5vw, 1.25rem); color: var(--muted); }

    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }

    .scene { height: min(74dvh, 660px); }

    /* Entrance, started by the loader curtain */
    .rise {
      opacity: 0;
      transform: translateY(28px);
      transition:
        opacity 0.9s var(--ease-out),
        transform 0.9s var(--ease-out);
      transition-delay: calc(var(--i) * 110ms);
    }

    .in .rise { opacity: 1; transform: none; }

    @media (max-width: 860px) {
      .grid { grid-template-columns: 1fr; padding-top: 8px; }
      .scene { height: min(52dvh, 420px); order: -1; }
      .hero::before { inset: 0; }
    }
  `,
})
export class HeroComponent {
  /** True once the loader curtain starts opening. */
  readonly play = input(false);
}
