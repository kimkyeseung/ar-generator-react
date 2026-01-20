'use client'

import { useState, useRef, useCallback, FC } from 'react'
import { z } from 'zod'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Compiler } from '../lib/image-target/compiler'
import { FileUpload } from './FileUpload'
import { Button } from './ui/button'
import { Progress } from './ui/progress'

const fileUploadSchema = z.object({
  attachments: z
    .array(z.instanceof(File))
    .min(1, '하나 이상의 파일을 첨부해야 합니다.') // 최소 1개
    .max(3, '최대 3개의 파일만 첨부할 수 있습니다.'), // 최대 3개
})

// 스키마로부터 TypeScript 타입 추론
type FileUploadFormData = z.infer<typeof fileUploadSchema>

interface Props {
  onCompileColplete: (target: ArrayBuffer, originalImage: File) => void
  onCompileStateChange?: (isCompiling: boolean) => void
  highPrecision?: boolean
}

const MindARCompiler: FC<Props> = ({
  onCompileColplete,
  onCompileStateChange,
  highPrecision = false,
}) => {
  const [isPending, setIsPending] = useState<boolean>(false)
  const { control, handleSubmit, watch } = useForm<FileUploadFormData>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: { attachments: [] },
  })

  const attachments = watch('attachments')

  // 상태 변수들
  const [progress, setProgress] = useState<number>(0)
  const [compiledData, setCompiledData] = useState<ArrayBuffer | null>(null)

  // DOM 요소와 인스턴스를 참조하기 위한 Ref
  const containerRef = useRef<HTMLDivElement>(null)
  const compilerRef = useRef(new Compiler())

  // 이미지 위에 특징점을 그리는 함수
  const showImage = useCallback(
    (targetImage: any, points: { x: number; y: number }[]) => {
      if (!containerRef.current) return

      const canvas = document.createElement('canvas')
      containerRef.current.appendChild(canvas)

      canvas.width = targetImage.width
      canvas.height = targetImage.height
      // CSS를 통해 크기를 명시적으로 설정해주는 것이 좋습니다.
      canvas.style.width = `${canvas.width}px`
      canvas.style.height = 'auto' // 비율 유지를 위해 auto로 설정

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = new Uint32Array(imageData.data.buffer)

      const alpha = 0xff << 24
      for (let c = 0; c < targetImage.width; c++) {
        for (let r = 0; r < targetImage.height; r++) {
          const pix = targetImage.data[r * targetImage.width + c]
          data[r * canvas.width + c] = alpha | (pix << 16) | (pix << 8) | pix
        }
      }

      const pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00 // green
      for (let i = 0; i < points.length; ++i) {
        const x = points[i].x
        const y = points[i].y

        // 점 주변에 십자 모양으로 더 큰 점을 그립니다.
        for (let size = 0; size <= 2; size++) {
          data[x + (y - size) * canvas.width] = pix
          data[x + (y + size) * canvas.width] = pix
          data[x - size + y * canvas.width] = pix
          data[x + size + y * canvas.width] = pix
        }
      }
      ctx.putImageData(imageData, 0, 0)
    },
    []
  )

  const initialize = function () {
    setProgress(0)
    if (containerRef.current) containerRef.current.innerHTML = '' // 이전 캔버스 초기화
  }

  // 컴파일된 데이터의 시각화 정보를 표시하는 함수
  const showData = useCallback(
    (data: any) => {
      for (let i = 0; i < data.trackingImageList.length; i++) {
        const image = data.trackingImageList[i]
        const points = data.trackingData[i].points.map((p: any) => ({
          x: Math.round(p.x),
          y: Math.round(p.y),
        }))
        showImage(image, points)
      }

      for (let i = 0; i < data.imageList.length; i++) {
        const image = data.imageList[i]
        const kpmPoints = [
          ...data.matchingData[i].maximaPoints,
          ...data.matchingData[i].minimaPoints,
        ]
        const points2 = kpmPoints.map((p: any) => ({
          x: Math.round(p.x),
          y: Math.round(p.y),
        }))
        showImage(image, points2)
      }
    },
    [showImage]
  )

  // 파일로부터 Image 객체를 로드하는 비동기 함수
  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      let img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const emitCompileState = useCallback(
    (state: boolean) => {
      onCompileStateChange?.(state)
    },
    [onCompileStateChange]
  )

  // 이미지 파일들을 컴파일하는 함수
  const compileFiles = useCallback(
    async (files: File[]) => {
      emitCompileState(true)
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
        // 원본 이미지 파일도 함께 전달
        onCompileColplete(arrayBuffer, files[0])
        setCompiledData(arrayBuffer)
      } finally {
        emitCompileState(false)
      }
    },
    [emitCompileState, onCompileColplete, highPrecision]
  )

  // .mind 파일을 로드하는 함수
  const loadMindFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = function () {
        const dataList = compilerRef.current.importData(
          this.result as ArrayBuffer
        )
        if (containerRef.current) containerRef.current.innerHTML = '' // 이전 캔버스 초기화
        dataList.forEach(showData)
      }
      reader.readAsArrayBuffer(file)
    },
    [showData]
  )

  // 'Download' 버튼 클릭 핸들러
  const handleDownload = () => {
    if (!compiledData) return
    const blob = new Blob([compiledData])
    const aLink = document.createElement('a')
    aLink.download = 'targets.mind'
    aLink.href = window.URL.createObjectURL(blob)
    aLink.click()
    window.URL.revokeObjectURL(aLink.href)
  }

  // 'Start' 버튼 클릭 핸들러
  const onSubmit: SubmitHandler<FileUploadFormData> = async (data) => {
    setIsPending(true)
    const formData = new FormData()
    data.attachments.forEach((file) => {
      formData.append('files', file) // 'files'라는 키로 파일 추가
    })

    initialize()

    const ext = data.attachments[0].name.split('.').pop()?.toLowerCase()
    if (ext === 'mind') {
      loadMindFile(data.attachments[0])
    } else {
      await compileFiles(data.attachments)
    }
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name='attachments'
        render={({ field }) => (
          <FileUpload
            accept='image/*'
            label='Target Image'
            icon='image'
            isMultiple
            onFileSelect={(...args) => {
              initialize()
              field.onChange(...args)
            }}
            file={field.value}
          />
        )}
      />
      {progress !== 0 && progress !== 100 && <Progress value={progress} />}

      {compiledData && (
        <div className='flex justify-center p-2'>
          <Button
            onClick={handleDownload}
            disabled={!compiledData}
            type='button'
          >
            Download
          </Button>
        </div>
      )}

      {progress !== 100 && (
        <Button
          type='submit'
          disabled={isPending || !attachments || attachments.length === 0}
          className='mt-6 w-full'
          size='lg'
        >
          Upload target image
        </Button>
      )}

      <div
        ref={containerRef}
        id='container'
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        {/* 생성된 캔버스가 여기에 추가됩니다. */}
      </div>
    </form>
  )
}

export default MindARCompiler
