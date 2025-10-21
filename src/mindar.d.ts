declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import type { Camera, Group, Scene, WebGLRenderer } from 'three';

  export interface MindARAnchor {
    group: Group;
  }

  export interface MindARThreeOptions {
    container: HTMLElement;
    imageTargetSrc: string;
  }

  export class MindARThree {
    constructor(options: MindARThreeOptions);
    renderer: WebGLRenderer;
    scene: Scene;
    camera: Camera;
    addAnchor(targetIndex: number): MindARAnchor;
    start(): Promise<void>;
    stop(): Promise<void>;
  }
}

declare module 'mind-ar/dist/mindar-image-aframe.prod.js';
