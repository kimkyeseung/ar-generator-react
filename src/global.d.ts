declare module 'aframe';

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
    }
  }
}

export {};
