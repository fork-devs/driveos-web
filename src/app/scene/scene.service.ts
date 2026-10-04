import { Injectable } from '@angular/core';
import type { SVGResult } from 'three/examples/jsm/loaders/SVGLoader.js';

type Three = typeof import('three');
type RoomEnv = typeof import('three/examples/jsm/environments/RoomEnvironment.js').RoomEnvironment;
type SvgLoader = typeof import('three/examples/jsm/loaders/SVGLoader.js').SVGLoader;

export interface SceneAssets {
  THREE: Three;
  SVGLoader: SvgLoader;
  RoomEnvironment: RoomEnv;
  logo: SVGResult;
}

/**
 * Lazy-loads three.js and the logo geometry once. The loader screen awaits preload(),
 * so the progress bar reflects real work and the hero scene mounts instantly afterwards.
 */
@Injectable({ providedIn: 'root' })
export class SceneService {
  private cache?: Promise<SceneAssets>;

  preload(): Promise<SceneAssets> {
    return (this.cache ??= this.load());
  }

  private async load(): Promise<SceneAssets> {
    const [THREE, { SVGLoader }, { RoomEnvironment }, svgText] = await Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/SVGLoader.js'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
      fetch('/brand/logo-dark.svg').then((r) => r.text()),
    ]);
    return { THREE, SVGLoader, RoomEnvironment, logo: new SVGLoader().parse(svgText) };
  }
}
