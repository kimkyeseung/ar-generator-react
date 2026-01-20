import { useState, useRef, useCallback } from 'react'
import { Compiler } from '../lib/image-target/compiler'

interface CompileOptions {
  highPrecision?: boolean
}

interface CompileResult {
  targetBuffer: ArrayBuffer
  originalImage: File
}

export function useImageCompiler() {
  const [isCompiling, setIsCompiling] = useState(false)
  const [progress, setProgress] = useState(0)
  const compilerRef = useRef(new Compiler())

  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const compile = useCallback(
    async (files: File[], options: CompileOptions = {}): Promise<CompileResult> => {
      const { highPrecision = false } = options

      setIsCompiling(true)
      setProgress(0)

      try {
        const images = await Promise.all(files.map(loadImage))

        const startTime = performance.now()
        await compilerRef.current.compileImageTargets(
          images,
          (progressValue: number) => {
            setProgress(progressValue)
          },
          { highPrecision }
        )
        console.log(
          `Execution time (compile): ${performance.now() - startTime}ms`
        )

        const exportedBuffer = compilerRef.current.exportData()
        const arrayCopy = exportedBuffer.slice()
        const arrayBuffer = arrayCopy.buffer

        return {
          targetBuffer: arrayBuffer,
          originalImage: files[0],
        }
      } finally {
        setIsCompiling(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setProgress(0)
    setIsCompiling(false)
  }, [])

  return {
    compile,
    isCompiling,
    progress,
    reset,
  }
}
