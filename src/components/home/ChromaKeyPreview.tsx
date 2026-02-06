import { useEffect, useRef, useState } from 'react'
import { ChromaKeySettings } from '../../types/project'
import { isValidHexColor } from '../../utils/validation'

interface ChromaKeyPreviewProps {
  videoFile: File
  chromaKeyColor: string
  chromaKeySettings: ChromaKeySettings
}

// HEX to RGB 변환
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 255, b: 0 } // 기본값: 그린
}

export default function ChromaKeyPreview({
  videoFile,
  chromaKeyColor,
  chromaKeySettings,
}: ChromaKeyPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)

  // 비디오 URL 생성
  useEffect(() => {
    const url = URL.createObjectURL(videoFile)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoFile])

  // 크로마키 처리 렌더링 루프
  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !isPlaying || showOriginal) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const keyColor = hexToRgb(isValidHexColor(chromaKeyColor) ? chromaKeyColor : '#00FF00')
    const { similarity, smoothness } = chromaKeySettings

    let animationId: number
    let isRunning = true

    const processFrame = () => {
      if (!isRunning || video.paused || video.ended) return

      // Canvas 크기를 비디오에 맞춤
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      // 비디오 프레임을 캔버스에 그리기
      ctx.drawImage(video, 0, 0)

      // 크로마키 처리
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        // 색상 거리 계산 (정규화)
        const distance =
          Math.sqrt(
            Math.pow(r - keyColor.r, 2) +
            Math.pow(g - keyColor.g, 2) +
            Math.pow(b - keyColor.b, 2)
          ) / Math.sqrt(3) / 255

        // 알파 계산
        if (distance < similarity) {
          data[i + 3] = 0
        } else if (distance < similarity + smoothness) {
          const alpha = (distance - similarity) / smoothness
          data[i + 3] = Math.round(alpha * 255)
        }
      }

      ctx.putImageData(imageData, 0, 0)
      animationId = requestAnimationFrame(processFrame)
    }

    processFrame()

    return () => {
      isRunning = false
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [isPlaying, showOriginal, chromaKeyColor, chromaKeySettings])

  const handlePlay = () => {
    const video = videoRef.current
    if (video) {
      video.play()
      setIsPlaying(true)
    }
  }

  const handlePause = () => {
    const video = videoRef.current
    if (video) {
      video.pause()
      setIsPlaying(false)
    }
  }

  if (!videoUrl) return null

  return (
    <div className='space-y-2 pt-3 border-t border-gray-200'>
      <div className='flex items-center justify-between'>
        <p className='text-sm font-medium text-gray-700'>미리보기</p>
        <label className='flex items-center gap-2 text-xs text-gray-500'>
          <input
            type='checkbox'
            checked={showOriginal}
            onChange={(e) => setShowOriginal(e.target.checked)}
            className='h-3 w-3 rounded border-gray-300 text-purple-600'
          />
          원본 보기
        </label>
      </div>

      {/* 미리보기 영역 */}
      <div className='relative aspect-video bg-[#1a1a2e] rounded-lg overflow-hidden'>
        {/* 체커보드 패턴 배경 (투명 영역 표시) */}
        {!showOriginal && (
          <div
            className='absolute inset-0'
            style={{
              backgroundImage: `
                linear-gradient(45deg, #333 25%, transparent 25%),
                linear-gradient(-45deg, #333 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #333 75%),
                linear-gradient(-45deg, transparent 75%, #333 75%)
              `,
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            }}
          />
        )}

        {/* 숨겨진 비디오 (소스용) */}
        <video
          ref={videoRef}
          src={videoUrl}
          className={showOriginal ? 'w-full h-full object-contain' : 'hidden'}
          loop
          muted
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* 크로마키 적용된 캔버스 */}
        {!showOriginal && (
          <canvas
            ref={canvasRef}
            className='absolute inset-0 w-full h-full object-contain'
          />
        )}

        {/* 재생/일시정지 오버레이 */}
        {!isPlaying && (
          <button
            type='button'
            onClick={handlePlay}
            className='absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors'
          >
            <div className='w-12 h-12 rounded-full bg-white/90 flex items-center justify-center'>
              <svg className='w-6 h-6 text-gray-800 ml-1' fill='currentColor' viewBox='0 0 24 24'>
                <path d='M8 5v14l11-7z' />
              </svg>
            </div>
          </button>
        )}

        {/* 재생 중 컨트롤 */}
        {isPlaying && (
          <button
            type='button'
            onClick={handlePause}
            className='absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors'
          >
            <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 24 24'>
              <path d='M6 4h4v16H6V4zm8 0h4v16h-4V4z' />
            </svg>
          </button>
        )}
      </div>

      <p className='text-xs text-gray-400'>
        체커보드 패턴은 투명하게 처리된 영역입니다
      </p>
    </div>
  )
}
