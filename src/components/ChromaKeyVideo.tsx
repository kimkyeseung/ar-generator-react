import { useEffect, useRef } from 'react'
import { ChromaKeySettings, DEFAULT_CHROMAKEY_SETTINGS } from '../types/project'
import { hexToRgb, precomputeChromaKeyConstants, applyChromaKey } from '../utils/chromakey'

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
    const constants = precomputeChromaKeyConstants(keyColor, similarity, smoothness)

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
      applyChromaKey(imageData.data, constants)
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
