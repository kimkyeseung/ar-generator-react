import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraResolution, ChromaKeySettings, DEFAULT_CHROMAKEY_SETTINGS, VideoPosition, VideoQuality } from '../types/project'
import { ProcessedMediaItem } from '../MindARViewerPage'
import { SpeakerIcon } from './ui/SpeakerIcon'
import ChromaKeyVideo from './ChromaKeyVideo'

// iOS 감지
const isIOS = () => {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

interface Props {
  videoUrl: string
  previewVideoUrl?: string
  position: VideoPosition
  scale: number
  chromaKeyColor?: string
  chromaKeySettings?: ChromaKeySettings
  cameraResolution?: CameraResolution
  videoQuality?: VideoQuality
  overlayImageUrl?: string // 오버레이 이미지 URL
  overlayLinkUrl?: string // 오버레이 이미지 클릭 시 열릴 URL
  guideImageUrl?: string // 안내문구 이미지 URL (영상 로딩 전 표시)
  mediaItems?: ProcessedMediaItem[] // 멀티 미디어 아이템
  debugMode?: boolean
}

const BasicModeViewer: React.FC<Props> = ({
  videoUrl,
  previewVideoUrl,
  position,
  scale,
  chromaKeyColor,
  chromaKeySettings = DEFAULT_CHROMAKEY_SETTINGS,
  cameraResolution = 'fhd',
  videoQuality = 'low',
  overlayImageUrl,
  overlayLinkUrl,
  guideImageUrl,
  mediaItems = [],
  debugMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // iOS는 muted 기본값 (자동재생 정책), Android는 unmuted 기본값
  const [isMuted, setIsMuted] = useState(isIOS())
  const [isLoading, setIsLoading] = useState(true)
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl) // 항상 원본 재생 (프리뷰 비활성화)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [actualCameraResolution, setActualCameraResolution] = useState<string | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false) // 영상 재생 중 여부 (안내문구 숨김용)

  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null) // 영상 비율 (width/height)
  const [videoFileSize, setVideoFileSize] = useState<number | null>(null) // 비디오 파일 크기 (bytes)
  const [videoResolution, setVideoResolution] = useState<string | null>(null) // 비디오 해상도

  // props 변경 시 상태 리셋
  useEffect(() => {
    setCurrentVideoUrl(videoUrl) // 항상 원본 재생 (프리뷰 비활성화)
  }, [videoUrl])

  // 디버그 모드: 비디오 파일 크기 가져오기
  useEffect(() => {
    if (!debugMode) return

    const fetchVideoSize = async (url: string) => {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        const contentLength = response.headers.get('Content-Length')
        if (contentLength) {
          setVideoFileSize(parseInt(contentLength, 10))
        }
      } catch (e) {
        console.warn('[BasicMode] Failed to fetch video size:', e)
      }
    }

    fetchVideoSize(currentVideoUrl)
  }, [debugMode, currentVideoUrl])

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
    const { similarity, smoothness } = chromaKeySettings

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
  }, [chromaKeyColor, chromaKeySettings, currentVideoUrl])

  // isMuted 상태 변경 시 비디오에 반영
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.muted = isMuted
    }
  }, [isMuted])

  // 오버레이 이미지 클릭 핸들러
  const handleOverlayClick = useCallback(() => {
    if (overlayLinkUrl) {
      window.open(overlayLinkUrl, '_blank', 'noopener,noreferrer')
    }
  }, [overlayLinkUrl])

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
        const resolution = `${video.videoWidth}x${video.videoHeight}`
        setVideoAspectRatio(ratio)
        setVideoResolution(resolution)
        console.log(`[BasicMode] Video aspect ratio: ${ratio.toFixed(2)} (${resolution})`)
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
          <span className={`px-2 py-0.5 rounded ${
            !previewVideoUrl || currentVideoUrl === videoUrl ? 'bg-green-500' : 'bg-yellow-500'
          }`}>
            {!previewVideoUrl || currentVideoUrl === videoUrl ? '🔄 원본 재생중' : '⏳ 프리뷰 재생중'}
          </span>
          {videoResolution && (
            <span className="px-2 py-0.5 rounded bg-indigo-500">
              🖥️ {videoResolution}
            </span>
          )}
          {videoFileSize && (
            <span className="px-2 py-0.5 rounded bg-teal-500">
              💾 {(videoFileSize / 1024 / 1024).toFixed(1)}MB
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

        {/* 안내문구 이미지 (영상 재생 전까지 표시) */}
        {guideImageUrl && !isVideoPlaying && !isLoading && !cameraError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <img
              src={guideImageUrl}
              alt="안내문구"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* 비디오 오버레이 */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${position.x * 100}%`,
            top: `${position.y * 100}%`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            // scale=1(100%)일 때 화면에 맞춤: 세로 영상은 width 100%, 가로 영상은 height 100%
            ...(videoAspectRatio === null
              ? { width: '100%', height: '100%' }
              : videoAspectRatio < 1
                ? { width: '100%', aspectRatio: `${videoAspectRatio}` }
                : { height: '100%', aspectRatio: `${videoAspectRatio}` }
            ),
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
                onPlay={() => setIsVideoPlaying(true)}
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
              onPlay={() => setIsVideoPlaying(true)}
              className="h-full w-full object-contain"
            />
          )}
        </div>

        {/* 멀티 미디어 아이템 (기본 모드용) */}
        {mediaItems
          .filter((item) => item.mode === 'basic')
          .map((item) => (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: `${item.position.x * 100}%`,
                top: `${item.position.y * 100}%`,
                transform: `translate(-50%, -50%) scale(${item.scale})`,
                // scale=1(100%)일 때 화면에 맞춤
                ...(!item.aspectRatio
                  ? { width: '100%', height: '100%' }
                  : item.aspectRatio < 1
                    ? { width: '100%', aspectRatio: `${item.aspectRatio}` }
                    : { height: '100%', aspectRatio: `${item.aspectRatio}` }
                ),
                pointerEvents: item.linkEnabled && item.linkUrl ? 'auto' : 'none',
                zIndex: 10 + item.order, // 레이어 순서
              }}
            >
              {item.type === 'image' ? (
                item.linkEnabled && item.linkUrl ? (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <img
                      src={item.fileUrl}
                      alt={`Media item ${item.order}`}
                      className="w-full h-full object-contain"
                    />
                  </a>
                ) : (
                  <img
                    src={item.fileUrl}
                    alt={`Media item ${item.order}`}
                    className="w-full h-full object-contain"
                  />
                )
              ) : item.chromaKeyEnabled ? (
                // 크로마키가 활성화된 비디오
                <ChromaKeyVideo
                  src={item.previewFileUrl || item.fileUrl}
                  chromaKeyColor={item.chromaKeyColor || '#00FF00'}
                  chromaKeySettings={item.chromaKeySettings}
                  className="w-full h-full object-contain"
                />
              ) : (
                // 일반 비디오
                <video
                  src={item.previewFileUrl || item.fileUrl}
                  loop
                  muted
                  playsInline
                  autoPlay
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          ))}

        {/* 오버레이 이미지 버튼 */}
        {overlayImageUrl && (
          <button
            onClick={handleOverlayClick}
            className="fixed bottom-20 right-4 z-30 rounded-xl overflow-hidden shadow-lg transition-transform active:scale-95 hover:scale-105"
            style={{
              cursor: overlayLinkUrl ? 'pointer' : 'default',
            }}
            aria-label={overlayLinkUrl ? '링크 열기' : '오버레이 이미지'}
          >
            <img
              src={overlayImageUrl}
              alt="오버레이 이미지"
              className="w-16 h-16 object-contain bg-white/90 backdrop-blur-sm"
            />
            {overlayLinkUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
            )}
          </button>
        )}
      </div>
    </>
  )
}

export default BasicModeViewer
