import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CameraResolution, VideoPosition } from '../types/project'
import { SpeakerIcon } from './ui/SpeakerIcon'

interface Props {
  videoUrl: string
  previewVideoUrl?: string
  position: VideoPosition
  scale: number
  chromaKeyColor?: string
  cameraResolution?: CameraResolution
}

const BasicModeViewer: React.FC<Props> = ({
  videoUrl,
  previewVideoUrl,
  position,
  scale,
  chromaKeyColor,
  cameraResolution = 'fhd',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [isMuted, setIsMuted] = useState(true) // 항상 음소거로 시작 (자동 재생 지원)
  const [isLoading, setIsLoading] = useState(true)
  const [currentVideoUrl, setCurrentVideoUrl] = useState(previewVideoUrl || videoUrl)
  const [isHDReady, setIsHDReady] = useState(!previewVideoUrl)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null) // 영상 비율 (width/height)

  // 카메라 시작
  useEffect(() => {
    let stream: MediaStream | null = null

    // 해상도 설정에 따른 카메라 크기
    const resolutionMap: Record<CameraResolution, { width: number; height: number }> = {
      '4k': { width: 4096, height: 2160 },
      'qhd': { width: 2560, height: 1440 },
      'fhd': { width: 1920, height: 1080 },
      'hd': { width: 1280, height: 720 },
      'nhd': { width: 640, height: 360 },
      'vga': { width: 640, height: 480 },
      'qvga': { width: 320, height: 240 },
    }
    const { width: cameraWidth, height: cameraHeight } = resolutionMap[cameraResolution] || resolutionMap['fhd']
    console.log(`[BasicMode Camera] Requested resolution: ${cameraResolution} (${cameraWidth}x${cameraHeight})`)

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: cameraWidth, max: cameraWidth },
            height: { ideal: cameraHeight, max: cameraHeight },
          },
        })
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream
        }
        setCameraError(null)
        setIsLoading(false)
      } catch (err) {
        console.error('[BasicMode] Camera access error:', err)
        setCameraError('카메라 접근 권한이 필요합니다.')
        setIsLoading(false)
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [cameraResolution])

  // HD 비디오 프리로드
  useEffect(() => {
    if (!previewVideoUrl || isHDReady) return

    console.log('[BasicMode] Preloading HD video in background...')
    const hdVideo = document.createElement('video')
    hdVideo.preload = 'auto'
    hdVideo.muted = true
    hdVideo.playsInline = true
    hdVideo.crossOrigin = 'anonymous'
    hdVideo.src = videoUrl

    const handleCanPlay = () => {
      console.log('[BasicMode] HD video ready, switching source...')
      setIsHDReady(true)
      setCurrentVideoUrl(videoUrl)
    }

    hdVideo.addEventListener('canplaythrough', handleCanPlay, { once: true })
    hdVideo.load()

    return () => {
      hdVideo.removeEventListener('canplaythrough', handleCanPlay)
      hdVideo.src = ''
    }
  }, [videoUrl, previewVideoUrl, isHDReady])

  // 비디오 소스 변경 시 처리
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const currentTime = video.currentTime
    const wasPlaying = !video.paused

    if (video.src !== currentVideoUrl) {
      console.log(
        '[BasicMode] Switching video source to:',
        currentVideoUrl.includes('preview') ? 'preview' : 'HD'
      )
      video.src = currentVideoUrl
      video.currentTime = currentTime
      if (wasPlaying) {
        video.play().catch(() => {})
      }
    }
  }, [currentVideoUrl])

  // 크로마키 처리 (Canvas 2D)
  useEffect(() => {
    if (!chromaKeyColor || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

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
    const similarity = 0.4
    const smoothness = 0.08

    let animationId: number

    const processFrame = () => {
      if (video.paused || video.ended) {
        animationId = requestAnimationFrame(processFrame)
        return
      }

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 360

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

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

    video.addEventListener('play', () => {
      animationId = requestAnimationFrame(processFrame)
    })

    if (!video.paused) {
      animationId = requestAnimationFrame(processFrame)
    }

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [chromaKeyColor])

  // isMuted 상태 변경 시 비디오에 반영
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.muted = isMuted
    }
  }, [isMuted])

  // 음소거 토글
  const handleToggleMute = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    const newMutedState = !isMuted

    if (!newMutedState) {
      try {
        video.muted = false
        if (video.paused) {
          await video.play()
        }
        setIsMuted(false)
        console.log('[BasicMode] Sound enabled')
      } catch (e) {
        console.warn('[BasicMode] Failed to unmute:', e)
        video.muted = true
      }
    } else {
      video.muted = true
      setIsMuted(true)
      console.log('[BasicMode] Sound disabled')
    }
  }, [isMuted])

  // 비디오 자동 재생 (음소거 상태로 시작해야 브라우저 정책 충족)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // React의 muted prop 버그 우회: 직접 muted 속성 설정
    video.muted = true
    video.defaultMuted = true

    const attemptPlay = async () => {
      try {
        // 재생 전 음소거 보장
        video.muted = true
        await video.play()
        console.log('[BasicMode] Autoplay started (muted)')
      } catch (err) {
        console.warn('[BasicMode] Autoplay blocked:', err)
      }
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      attemptPlay()
    } else {
      video.addEventListener('canplay', attemptPlay, { once: true })
    }

    return () => {
      video.removeEventListener('canplay', attemptPlay)
    }
  }, [currentVideoUrl])

  // 영상 비율 감지
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        const ratio = video.videoWidth / video.videoHeight
        setVideoAspectRatio(ratio)
        console.log(`[BasicMode] Video aspect ratio: ${ratio.toFixed(2)} (${video.videoWidth}x${video.videoHeight})`)
      }
    }

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      handleLoadedMetadata()
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [currentVideoUrl])

  return (
    <>
      {/* 로딩 화면 */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
          <p className="text-lg font-medium text-white">카메라 준비 중...</p>
          <p className="mt-2 text-sm text-white/70">카메라 권한을 허용해주세요</p>
        </div>
      )}

      {/* 스피커 토글 버튼 */}
      <button
        onClick={handleToggleMute}
        className="fixed top-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-black/70 active:scale-95"
        aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
      >
        <SpeakerIcon muted={isMuted} />
      </button>

      {/* HD 로딩 표시기 */}
      {previewVideoUrl && !isHDReady && (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400"></div>
          <span>HD 로딩 중...</span>
        </div>
      )}
      {previewVideoUrl && isHDReady && (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
          <div className="h-2 w-2 rounded-full bg-green-400"></div>
          <span>HD</span>
        </div>
      )}

      {/* 메인 컨테이너 */}
      <div
        ref={containerRef}
        className="fixed inset-0 overflow-hidden bg-black"
      >
        {/* 카메라 배경 */}
        <video
          ref={cameraRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* 카메라 에러 */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
            <div className="text-center">
              <p className="text-lg font-medium text-white">{cameraError}</p>
              <p className="mt-2 text-sm text-white/70">
                브라우저 설정에서 카메라 권한을 허용해주세요.
              </p>
            </div>
          </div>
        )}

        {/* 비디오 오버레이 */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${position.x * 100}%`,
            top: `${position.y * 100}%`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            width: '50%',
            aspectRatio: videoAspectRatio ? `${videoAspectRatio}` : '16/9',
          }}
        >
          {chromaKeyColor ? (
            <>
              {/* 원본 비디오 (숨김) */}
              <video
                ref={videoRef}
                src={currentVideoUrl}
                loop
                muted
                playsInline
                crossOrigin="anonymous"
                autoPlay
                className="hidden"
              />
              {/* 크로마키 처리된 캔버스 */}
              <canvas
                ref={canvasRef}
                className="h-full w-full object-contain"
              />
            </>
          ) : (
            <video
              ref={videoRef}
              src={currentVideoUrl}
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              autoPlay
              className="h-full w-full object-contain"
            />
          )}
        </div>
      </div>
    </>
  )
}

export default BasicModeViewer
