import { CompilerBase } from './compiler-base.js'
import type { CompileTrackArgs, TargetImage } from './compiler-base.js'

type WorkerProgressMessage = {
  type: 'progress'
  percent: number
}

type WorkerCompileDoneMessage = {
  type: 'compileDone'
  list: unknown[]
}

type WorkerResponseMessage = WorkerProgressMessage | WorkerCompileDoneMessage

type WorkerRequestMessage = {
  type: 'compile'
  targetImages: TargetImage[]
}

export class Compiler extends CompilerBase {
  createProcessCanvas(img: HTMLImageElement): HTMLCanvasElement {
    const processCanvas = document.createElement('canvas')
    processCanvas.width = img.width
    processCanvas.height = img.height
    return processCanvas
  }

  compileTrack({
    progressCallback,
    targetImages,
    basePercent,
  }: CompileTrackArgs): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('./compiler.worker.js', import.meta.url)
      )

      worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
        const { data } = event
        if (data.type === 'progress') {
          progressCallback(basePercent + (data.percent * basePercent) / 100)
        } else if (data.type === 'compileDone') {
          worker.terminate()
          resolve(data.list)
        }
      }

      worker.onerror = (error: ErrorEvent) => {
        worker.terminate()
        reject(error)
      }

      const message: WorkerRequestMessage = {
        type: 'compile',
        targetImages,
      }

      worker.postMessage(message)
    })
  }
}
