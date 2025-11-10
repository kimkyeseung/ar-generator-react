export type ProgressCallback = (percent: number) => void

export type TargetImage = {
  data: Uint8Array
  width: number
  height: number
}

export type CompileTrackArgs = {
  progressCallback: ProgressCallback
  targetImages: TargetImage[]
  basePercent: number
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
    progressCallback: ProgressCallback
  ): Promise<CompilerDataEntry[]>

  exportData(): Uint8Array

  importData(buffer: ArrayBuffer): CompilerDataEntry[]

  createProcessCanvas(img: HTMLImageElement): HTMLCanvasElement

  compileTrack(args: CompileTrackArgs): Promise<unknown[]>
}
