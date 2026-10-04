import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-vehicle-3d-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viewer-layout">
      <div class="scene">
        <div class="holo-wrapper" [class]="status()">
          <div class="rotator">
            <i [class]="'ph car-icon ' + iconClass()"></i>
          </div>
          <div class="platform-base"></div>
        </div>
      </div>
      <div class="legend">
        <span class="l-item"><span class="dot green"></span> Óptimo</span>
        <span class="l-item"><span class="dot red"></span> Crítico</span>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 160px;
      display: grid;
      place-items: center;
      position: relative;
    }

    .viewer-layout {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      width: 100%;
      height: 100%;
    }

    .scene {
      perspective: 800px;
    }

    .holo-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: all 0.3s var(--ease-out);
    }

    /* Colors based on status */
    .holo-wrapper.ok { --holo-color: var(--c-green); }
    .holo-wrapper.critical { --holo-color: var(--c-red); }
    .holo-wrapper.warn { --holo-color: var(--c-accent); }

    .rotator {
      font-size: 5.5rem;
      color: var(--holo-color);
      filter: drop-shadow(0 0 16px color-mix(in srgb, var(--holo-color) 60%, transparent));
      animation: spinY 4s linear infinite;
      transform-style: preserve-3d;
      line-height: 1;
    }

    .platform-base {
      width: 140px;
      height: 35px;
      margin-top: -15px;
      border-radius: 50%;
      background: radial-gradient(circle closest-side, color-mix(in srgb, var(--holo-color) 45%, transparent), transparent);
      transform: rotateX(65deg);
      border: 1px solid color-mix(in srgb, var(--holo-color) 30%, transparent);
    }

    .legend {
      display: flex;
      gap: 12px;
      font-size: 0.72rem;
      color: var(--muted);
      background: var(--card-nested);
      padding: 6px 14px;
      border-radius: var(--r-pill);
      border: 1px solid var(--line);
    }

    .l-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    .dot.green {
      background: var(--c-green);
      box-shadow: 0 0 8px 1px color-mix(in srgb, var(--c-green) 70%, transparent);
    }

    .dot.red {
      background: var(--c-red);
      box-shadow: 0 0 8px 1px color-mix(in srgb, var(--c-red) 70%, transparent);
    }

    @keyframes spinY {
      from { transform: rotateY(0deg); }
      to { transform: rotateY(360deg); }
    }
  `
})
export class Vehicle3dViewerComponent {
  readonly vehicle = input.required<string>();
  readonly status = input<'ok' | 'warn' | 'critical'>('ok');
  
  readonly iconClass = computed(() => {
    const v = this.vehicle().toLowerCase();
    if (v.includes('hilux') || v.includes('pickup') || v.includes('truck') || v.includes('camion')) {
      return 'ph-jeep';
    }
    return 'ph-car-profile';
  });
}
