import React, { useEffect, useRef } from 'react'
import { ChromaKeySettings, DEFAULT_CHROMAKEY_SETTINGS } from '../types/project'

interface ChromaKeyVideoProps {
  src: string
  chromaKeyColor: string
  chromaKeySettings?: ChromaKeySettings
  className?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
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
}: ChromaKeyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    // willReadFrequently 옵션으로 성능 최적화
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    console.log(`[ChromaKeyVideo] Initialized with color=${chromaKeyColor}, similarity=${chromaKeySettings.similarity}, smoothness=${chromaKeySettings.smoothness}`)

    // 크로마키 색상 파싱
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 255, b: 0 }
    }

    const keyColor = hexToRgb(chromaKeyColor)
    const { similarity, smoothness } = chromaKeySettings

    let animationId: number
    let isRunning = true

    let frameCount = 0
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
        console.log(`[ChromaKeyVideo] Canvas resized to ${vw}x${vh}`)
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // 첫 프레임에서 디버그 로그
      if (frameCount === 0) {
        console.log(`[ChromaKeyVideo] Processing first frame, video size: ${vw}x${vh}`)
      }
      frameCount++

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        // 색상 거리 계산
        const distance =
          Math.sqrt(
            Math.pow((r - keyColor.r) / 255, 2) +
              Math.pow((g - keyColor.g) / 255, 2) +
              Math.pow((b - keyColor.b) / 255, 2)
          ) / Math.sqrt(3)

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

    const handlePlay = () => {
      if (isRunning) {
        animationId = requestAnimationFrame(processFrame)
      }
    }

    const handleLoadedData = () => {
      if (autoPlay) {
        video.play().catch(() => {})
      }
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
  }, [src, chromaKeyColor, chromaKeySettings, autoPlay])

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
