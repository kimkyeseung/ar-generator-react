declare module 'aframe';

declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import type { Group } from 'three'

  export interface MindARAnchor {
    group: Group
  }

  export interface MindARThreeOptions {
    container: HTMLElement
    imageTargetSrc: string
  }
}

declare module 'mind-ar/dist/mindar-image-aframe.prod.js'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': any;
      'a-assets': any;
      'a-asset-item': any;
      'a-camera': any;
      'a-entity': any;
      'a-plane': any;
      'a-gltf-model': any;
      'a-video': any;
    }
  }
}

export {};
