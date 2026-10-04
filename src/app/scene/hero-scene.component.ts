import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { BufferGeometry, Mesh } from 'three';
import { LogoComponent } from '../shared/logo.component';
import { SceneService, SceneAssets } from './scene.service';

gsap.registerPlugin(ScrollTrigger);

const SCALE = 0.0026; // SVG units to scene units
const HAT_LIFT = 26; // resting gap between hat and visor, in SVG units
const HAT_DROP = 340; // how far above the hat starts, for the assembly intro

/**
 * Hero 3D: the DriveOS mark extruded from its own SVG, with a drifting field of "readings".
 * Motion job: brand recognition (echoes the loader assembly) and depth on pointer move.
 * three.js is loaded lazily through SceneService and disposed on destroy.
 */
@Component({
  selector: 'app-hero-scene',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoComponent],
  template: `
    <div #stage class="stage" role="img" [attr.aria-label]="label()">
      <canvas #canvas [class.hidden]="fallback()"></canvas>
      @if (fallback()) {
        <app-logo class="fallback" [label]="label()" />
      }
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; height: 100%; }
    .stage { position: relative; width: 100%; height: 100%; min-height: 340px; }
    canvas { width: 100%; height: 100%; touch-action: pan-y; }
    canvas.hidden { display: none; }
    .fallback { position: absolute; inset: 12% 22%; color: var(--c-primary); }
  `,
})
export class HeroSceneComponent {
  readonly play = input(false);
  readonly label = input('');
  protected readonly fallback = signal(false);

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly scene = inject(SceneService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => void this.start());
  }

  private async start(): Promise<void> {
    let dispose: (() => void) | undefined;
    let destroyed = false;
    this.destroyRef.onDestroy(() => {
      destroyed = true;
      dispose?.();
    });

    try {
      const assets = await this.scene.preload();
      if (destroyed) return;
      dispose = this.build(assets);
    } catch {
      this.fallback.set(true);
    }
  }

  private build(assets: SceneAssets): () => void {
    const { THREE, SVGLoader, RoomEnvironment, logo } = assets;
    const stage = this.stage().nativeElement;
    const canvas = this.canvas().nativeElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = matchMedia('(max-width: 767px)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.95;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 4, 6);
    scene.add(key);

    // Logo geometry, extruded from the traced SVG paths (hat, body, eyes).
    const rig = new THREE.Group();
    const inner = new THREE.Group();
    inner.scale.set(SCALE, -SCALE, SCALE);
    inner.position.set(-548 * SCALE, 666 * SCALE, -55 * SCALE);
    rig.add(inner);
    scene.add(rig);

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0071eb,
      roughness: 0.32,
      metalness: 0.05,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25,
    });
    const eyeMat = new THREE.MeshPhysicalMaterial({
      color: 0x69b1ff,
      roughness: 0.4,
      clearcoat: 0.4,
    });

    const depths = [80, 110, 60, 60];
    const geometries: BufferGeometry[] = [];
    let hat: Mesh | undefined;

    logo.paths.forEach((path, i) => {
      const shapes = SVGLoader.createShapes(path);
      const geo = new THREE.ExtrudeGeometry(shapes, {
        depth: depths[i] ?? 60,
        bevelEnabled: true,
        bevelThickness: 10,
        bevelSize: 9,
        bevelOffset: -9,
        bevelSegments: 4,
        curveSegments: 18,
      });
      geometries.push(geo);
      const mesh = new THREE.Mesh(geo, i >= 2 ? eyeMat : bodyMat);
      if (i >= 2) mesh.position.z = 26;
      if (i === 0) hat = mesh;
      inner.add(mesh);
    });

    // Drifting readings: soft points rising slowly, wrapping around a box.
    const N = small ? 110 : 240;
    const pos = new Float32Array(N * 3);
    const speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1;
      speed[i] = 0.06 + Math.random() * 0.14;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x69b1ff,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // State
    let raf = 0;
    let last = 0;
    let t = 0;
    let intro = reduced ? 1 : 0;
    let px = 0;
    let py = 0;
    let scroll = 0;
    let visible = true;
    let running = false;

    const resize = () => {
      const w = Math.max(stage.clientWidth, 1);
      const h = Math.max(stage.clientHeight, 1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.set(0, 0, Math.max(9, 7.4 / camera.aspect));
      camera.updateProjectionMatrix();
      if (!running) renderer.render(scene, camera);
    };

    const applyHat = () => {
      const eased = 1 - Math.pow(1 - intro, 4);
      if (hat) hat.position.y = -(HAT_LIFT + (1 - eased) * HAT_DROP + Math.sin(t * 1.1) * 8);
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      if (this.play() && intro < 1) intro = Math.min(1, intro + dt / 1.5);
      applyHat();

      rig.position.y = Math.sin(t * 0.7) * 0.05;
      const ty = -0.32 + px * 0.42 + scroll * 0.9;
      const tx = py * 0.2;
      rig.rotation.y += (ty - rig.rotation.y) * 0.06;
      rig.rotation.x += (tx - rig.rotation.x) * 0.06;

      const arr = pGeo.attributes['position'].array as Float32Array;
      for (let i = 0; i < N; i++) {
        arr[i * 3 + 1] += speed[i] * dt;
        if (arr[i * 3 + 1] > 3.2) arr[i * 3 + 1] = -3.2;
      }
      pGeo.attributes['position'].needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const sync = () => {
      const shouldRun = visible && !document.hidden && !reduced;
      if (shouldRun && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    const onPointer = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(stage);
    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => (scroll = self.progress),
    });

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', sync);

    rig.rotation.y = -0.32;
    applyHat();
    resize();
    sync();
    if (reduced) renderer.render(scene, camera);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      trigger.kill();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', sync);
      geometries.forEach((g) => g.dispose());
      pGeo.dispose();
      pMat.dispose();
      bodyMat.dispose();
      eyeMat.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }
}
