declare module 'aframe'

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

declare module 'mind-ar/src/image-target' {
  type CompilerBase = import('./lib/image-target/compiler-base').CompilerBase
  type CompileTrackArgs =
    import('./lib/image-target/compiler-base').CompileTrackArgs
  type CompilerDataEntry =
    import('./lib/image-target/compiler-base').CompilerDataEntry
  type ProgressCallback =
    import('./lib/image-target/compiler-base').ProgressCallback

  type ModelViewTransformRow = [number, number, number, number]
  type ModelViewTransform = [
    ModelViewTransformRow,
    ModelViewTransformRow,
    ModelViewTransformRow,
  ]

  type WorldMatrix = Float32Array | number[]

  type ControllerTargetsData = {
    dimensions: Array<[number, number]>
    matchingDataList: unknown[]
    trackingDataList: unknown[]
  }

  type TrackPoints = {
    worldCoords: Array<{ x: number; y: number; z: number }>
    screenCoords: Array<{ x: number; y: number }>
  }

  type TrackResult = TrackPoints & {
    debugExtra: unknown
  }

  type ControllerUpdateMatrixEvent = {
    type: 'updateMatrix'
    targetIndex: number
    worldMatrix: WorldMatrix | null
  }

  type ControllerProcessDoneEvent = {
    type: 'processDone'
  }

  type ControllerUpdateEvent =
    | ControllerUpdateMatrixEvent
    | ControllerProcessDoneEvent

  interface ControllerOptions {
    inputWidth: number
    inputHeight: number
    maxTrack?: number
    debugMode?: boolean
    warmupTolerance?: number | null
    missTolerance?: number | null
    filterMinCF?: number | null
    filterBeta?: number | null
    onUpdate?: (event: ControllerUpdateEvent) => void
  }

  export class Controller {
    constructor(options: ControllerOptions)

    showTFStats(): void

    addImageTargets(fileURL: string): Promise<ControllerTargetsData>

    addImageTargetsFromBuffer(buffer: ArrayBuffer): ControllerTargetsData

    dispose(): void

    dummyRun(
      input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    ): void

    getProjectionMatrix(): WorldMatrix

    getWorldMatrix(
      modelViewTransform: ModelViewTransform,
      targetIndex: number
    ): WorldMatrix

    processVideo(
      input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    ): void

    stopProcessVideo(): void

    detect(
      input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    ): Promise<{
      featurePoints: unknown
      debugExtra: unknown
    }>

    match(
      featurePoints: unknown,
      targetIndex: number
    ): Promise<{
      modelViewTransform: ModelViewTransform | null
      debugExtra: unknown
    }>

    track(
      input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
      modelViewTransform: ModelViewTransform,
      targetIndex: number
    ): Promise<TrackResult>

    trackUpdate(
      modelViewTransform: ModelViewTransform,
      trackFeatures: TrackPoints
    ): Promise<ModelViewTransform | null>
  }

  export class Compiler extends CompilerBase {
    constructor()

    createProcessCanvas(img: HTMLImageElement): HTMLCanvasElement

    compileTrack(args: CompileTrackArgs): Promise<unknown[]>

    compileImageTargets(
      images: HTMLImageElement[],
      progressCallback: ProgressCallback
    ): Promise<CompilerDataEntry[]>

    exportData(): Uint8Array

    importData(buffer: ArrayBuffer): CompilerDataEntry[]
  }

  type UIElementOption = 'yes' | 'no' | string

  interface UIOptions {
    uiLoading?: UIElementOption
    uiScanning?: UIElementOption
    uiError?: UIElementOption
  }

  export class UI {
    constructor(options: UIOptions)

    showLoading(): void
    hideLoading(): void
    showCompatibility(): void
    hideCompatibility(): void
    showScanning(): void
    hideScanning(): void
  }
}

declare module 'mind-ar/dist/mindar-image-aframe.prod.js'

declare namespace JSX {
  interface IntrinsicElements {
    'a-scene': any
    'a-assets': any
    'a-asset-item': any
    'a-camera': any
    'a-entity': any
    'a-plane': any
    'a-gltf-model': any
    'a-video': any
  }
}
