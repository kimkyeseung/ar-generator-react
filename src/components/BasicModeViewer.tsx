import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CameraResolution, VideoPosition, VideoQuality } from '../types/project'
import { SpeakerIcon } from './ui/SpeakerIcon'

interface Props {
  videoUrl: string
  previewVideoUrl?: string
  position: VideoPosition
  scale: number
  chromaKeyColor?: string
  cameraResolution?: CameraResolution
  videoQuality?: VideoQuality
  debugMode?: boolean
}

const BasicModeViewer: React.FC<Props> = ({
  videoUrl,
  previewVideoUrl,
  position,
  scale,
  chromaKeyColor,
  cameraResolution = 'fhd',
  videoQuality = 'low',
  debugMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [isMuted, setIsMuted] = useState(true) // 항상 음소거로 시작 (자동 재생 지원)
  const [isLoading, setIsLoading] = useState(true)
  const [currentVideoUrl, setCurrentVideoUrl] = useState(previewVideoUrl || videoUrl)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [actualCameraResolution, setActualCameraResolution] = useState<string | null>(null)

  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null) // 영상 비율 (width/height)

  // props 변경 시 상태 리셋
  useEffect(() => {
    setCurrentVideoUrl(previewVideoUrl || videoUrl)
  }, [videoUrl, previewVideoUrl])

  // 카메라 시작
  useEffect(() => {
    let stream: MediaStream | null = null

    // 해상도 설정에 따른 카메라 크기 (iPhone 브라우저 최대 FHD 지원)
    const resolutionMap: Record<CameraResolution, { width: number; height: number }> = {
      'fhd': { width: 1920, height: 1080 },
      'hd': { width: 1280, height: 720 },
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
          // 실제 카메라 해상도 추적
          const videoTrack = stream.getVideoTracks()[0]
          if (videoTrack) {
            const settings = videoTrack.getSettings()
            setActualCameraResolution(`${settings.width}x${settings.height}`)
            console.log(`[BasicMode Camera] Actual resolution: ${settings.width}x${settings.height}`)
          }
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

  // HD 비디오 프리로드 (백그라운드에서 HD 로드 후 전환)
  useEffect(() => {
    if (!previewVideoUrl) return

    console.log('[BasicMode] Preloading HD video in background...')
    const hdVideo = document.createElement('video')
    hdVideo.preload = 'auto'
    hdVideo.muted = true
    hdVideo.playsInline = true
    hdVideo.crossOrigin = 'anonymous'
    hdVideo.src = videoUrl

    const handleCanPlay = () => {
      console.log('[BasicMode] HD video ready, switching source...')
      setCurrentVideoUrl(videoUrl)
    }

    hdVideo.addEventListener('canplaythrough', handleCanPlay, { once: true })
    hdVideo.load()

    return () => {
      hdVideo.removeEventListener('canplaythrough', handleCanPlay)
      hdVideo.src = ''
    }
  }, [videoUrl, previewVideoUrl])

  // 비디오 소스 설정 및 재생 (초기화 + 소스 변경)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentVideoUrl) return

    // React의 muted prop 버그 우회
    video.muted = true
    video.defaultMuted = true

    const currentTime = video.currentTime || 0
    const isInitialLoad = !video.src

    console.log(
      '[BasicMode] Setting video source:',
      currentVideoUrl.includes('preview') ? 'preview' : 'HD',
      isInitialLoad ? '(initial)' : '(switching)'
    )

    video.src = currentVideoUrl
    video.load()

    // 비디오 로드 후 재생
    const handleCanPlay = () => {
      // 소스 전환 시 재생 위치 복원 (초기 로드가 아닌 경우)
      if (!isInitialLoad && currentTime > 0) {
        video.currentTime = Math.min(currentTime, video.duration || 0)
      }
      // 음소거 상태로 자동 재생
      video.muted = true
      video.play().catch((e) => {
        console.warn('[BasicMode] Play failed:', e)
      })
    }

    // loop 속성이 실패할 경우 수동으로 재시작
    const handleEnded = () => {
      console.log('[BasicMode] Video ended, manually restarting...')
      video.currentTime = 0
      video.play().catch((e) => {
        console.warn('[BasicMode] Loop restart failed:', e)
      })
    }

    // 재생이 멈춘 경우 다시 시작 (일부 브라우저 버그 대응)
    const handlePause = () => {
      // 의도적인 일시정지가 아닌 경우 재시작
      if (!video.ended && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        console.log('[BasicMode] Video paused unexpectedly, restarting...')
        video.play().catch((e) => {
          console.warn('[BasicMode] Resume after pause failed:', e)
        })
      }
    }

    video.addEventListener('canplay', handleCanPlay, { once: true })
    video.addEventListener('ended', handleEnded)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('pause', handlePause)
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
    let isRunning = true

    const processFrame = () => {
      if (!isRunning) return

      // 비디오가 일시정지나 종료 상태여도 계속 프레임 요청 (loop 대기)
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

    const handlePlay = () => {
      if (isRunning) {
        animationId = requestAnimationFrame(processFrame)
      }
    }

    video.addEventListener('play', handlePlay)

    if (!video.paused) {
      animationId = requestAnimationFrame(processFrame)
    }

    return () => {
      isRunning = false
      cancelAnimationFrame(animationId)
      video.removeEventListener('play', handlePlay)
    }
  }, [chromaKeyColor, currentVideoUrl])

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

  // 가로/세로 전환 시 레이아웃 강제 갱신
  useEffect(() => {
    const handleOrientationChange = () => {
      console.log('[BasicMode] Orientation changed, forcing layout update...')
      // 레이아웃이 업데이트될 시간을 주고 강제 리렌더
      setTimeout(() => {
        // 비디오 요소들의 스타일을 강제로 다시 적용
        if (cameraRef.current) {
          cameraRef.current.style.width = '100%'
          cameraRef.current.style.height = '100%'
        }
        if (canvasRef.current && chromaKeyColor) {
          // 캔버스 크기는 processFrame에서 자동 조정되므로 별도 처리 불필요
        }
      }, 100)
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [chromaKeyColor])

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

      {/* 디버그 모드: 상태 표시 */}
      {debugMode && (
        <div className="fixed bottom-4 left-4 z-40 flex flex-wrap items-center gap-2 rounded-lg bg-black/70 px-3 py-2 text-xs text-white backdrop-blur-sm">
          {actualCameraResolution && (
            <span className="px-2 py-0.5 rounded bg-blue-500">
              📷 {actualCameraResolution}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded ${
            videoQuality === 'high' ? 'bg-purple-500' :
            videoQuality === 'medium' ? 'bg-blue-500' : 'bg-orange-500'
          }`}>
            🎬 {videoQuality === 'high' ? '고화질' : videoQuality === 'medium' ? '중화질' : '저화질'}
          </span>
          {previewVideoUrl && (
            <span className={`px-2 py-0.5 rounded ${
              currentVideoUrl === videoUrl ? 'bg-green-500' : 'bg-yellow-500'
            }`}>
              {currentVideoUrl === videoUrl ? '🔄 원본 재생중' : '⏳ 프리뷰 재생중'}
            </span>
          )}
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
            // VideoPositionEditor와 동일한 로직: 세로 영상은 폭을 비율만큼 좁게
            width: videoAspectRatio && videoAspectRatio >= 1 ? '50%' : `${50 * (videoAspectRatio || 1)}%`,
            aspectRatio: videoAspectRatio ? `${videoAspectRatio}` : '16/9',
          }}
        >
          {chromaKeyColor ? (
            <>
              {/* 원본 비디오 (숨김) */}
              <video
                ref={videoRef}
                loop
                muted
                playsInline
                crossOrigin="anonymous"
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
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              className="h-full w-full object-contain"
            />
          )}
        </div>
      </div>
    </>
  )
}

export default BasicModeViewer
