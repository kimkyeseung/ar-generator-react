import { useEffect, useRef } from 'react'
import { ChromaKeySettings, DEFAULT_CHROMAKEY_SETTINGS } from '../types/project'
import { hexToRgb } from '../utils/chromakey'

interface ChromaKeyVideoProps {
  src: string
  chromaKeyColor: string
  chromaKeySettings?: ChromaKeySettings
  className?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  onLoadedData?: () => void
}

/**
 * 크로마키 처리가 적용된 비디오 컴포넌트
 * Canvas 2D를 사용하여 실시간으로 크로마키 색상을 투명하게 처리
 */
export default function ChromaKeyVideo({
  src,
  chromaKeyColor,
  chromaKeySettings = DEFAULT_CHROMAKEY_SETTINGS,
  className = '',
  autoPlay = true,
  loop = true,
  muted = true,
  onLoadedData,
}: ChromaKeyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // muted prop 변경 시 비디오에 반영 (pause 없이 muted만 변경하여 즉시 적용)
  useEffect(() => {
    const video = videoRef.current
    if (video && video.muted !== muted) {
      video.muted = muted
      // 일시정지 상태였으면 재생 시작
      if (video.paused) {
        video.play().catch(() => {})
      }
    }
  }, [muted])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    // willReadFrequently 옵션으로 성능 최적화
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const keyColor = hexToRgb(chromaKeyColor)
    const { similarity, smoothness } = chromaKeySettings

    // 성능 최적화: 루프 밖에서 상수 미리 계산 (Math.sqrt/Math.pow 제거)
    const inv255 = 1 / 255
    const { r: kr, g: kg, b: kb } = keyColor
    const simSq3 = similarity * similarity * 3
    const smoothBound = similarity + smoothness
    const smoothBoundSq3 = smoothBound * smoothBound * 3
    const invSmoothness = smoothness > 0 ? 1 / smoothness : 0
    const sqrt3 = Math.sqrt(3)

    let animationId: number
    let isRunning = true

    const processFrame = () => {
      if (!isRunning) return

      if (video.paused || video.ended) {
        animationId = requestAnimationFrame(processFrame)
        return
      }

      const vw = video.videoWidth || 640
      const vh = video.videoHeight || 360

      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw
        canvas.height = vh
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        // 제곱 거리로 비교 (대부분 픽셀에서 Math.sqrt 불필요)
        const dr = (data[i] - kr) * inv255
        const dg = (data[i + 1] - kg) * inv255
        const db = (data[i + 2] - kb) * inv255
        const distSq3 = dr * dr + dg * dg + db * db

        if (distSq3 < simSq3) {
          data[i + 3] = 0
        } else if (distSq3 < smoothBoundSq3) {
          // 전환 영역 픽셀만 sqrt 계산 (전체의 소수)
          const distance = Math.sqrt(distSq3) / sqrt3
          data[i + 3] = Math.round((distance - similarity) * invSmoothness * 255)
        }
      }

      ctx.putImageData(imageData, 0, 0)
      animationId = requestAnimationFrame(processFrame)
    }

    const handlePlay = () => {
      if (isRunning) {
        animationId = requestAnimationFrame(processFrame)
      }
    }

    const handleLoadedData = () => {
      if (autoPlay) {
        video.play().catch(() => {})
      }
      onLoadedData?.()
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('loadeddata', handleLoadedData)

    if (!video.paused) {
      animationId = requestAnimationFrame(processFrame)
    }

    return () => {
      isRunning = false
      cancelAnimationFrame(animationId)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('loadeddata', handleLoadedData)
    }
  }, [src, chromaKeyColor, chromaKeySettings, autoPlay, onLoadedData])

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        loop={loop}
        muted={muted}
        playsInline
        autoPlay={autoPlay}
        crossOrigin="anonymous"
        className="hidden"
      />
      <canvas ref={canvasRef} className={className} />
    </>
  )
}
