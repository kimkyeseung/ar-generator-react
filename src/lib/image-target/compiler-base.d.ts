export type ProgressCallback = (percent: number) => void

export type TargetImage = {
  data: Uint8Array
  width: number
  height: number
}

export type CompileOptions = {
  highPrecision?: boolean
}

export type CompileTrackArgs = {
  progressCallback: ProgressCallback
  targetImages: TargetImage[]
  basePercent: number
  options?: CompileOptions
}

export type CompilerDataEntry = {
  targetImage: {
    width: number
    height: number
  }
  trackingData: unknown
  matchingData: unknown
  trackingImageList?: unknown
  imageList?: unknown
}

export class CompilerBase {
  protected data: CompilerDataEntry[] | null

  constructor()

  compileImageTargets(
    images: HTMLImageElement[],
    progressCallback: ProgressCallback,
    options?: CompileOptions
  ): Promise<CompilerDataEntry[]>

  exportData(): Uint8Array

  importData(buffer: ArrayBuffer): CompilerDataEntry[]

  createProcessCanvas(img: HTMLImageElement): HTMLCanvasElement

  compileTrack(args: CompileTrackArgs): Promise<unknown[]>
}
