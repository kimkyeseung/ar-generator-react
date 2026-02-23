import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraResolution, VideoQuality } from '../types/project'
import { ProcessedMediaItem } from '../MindARViewerPage'
import { SpeakerIcon } from './ui/SpeakerIcon'
import ChromaKeyVideo from './ChromaKeyVideo'
import { getCameraResolution, isIOSDevice } from '../utils/camera'
import { normalizeUrl } from '../utils/validation'

interface Props {
  mediaItems: ProcessedMediaItem[]
  cameraResolution?: CameraResolution
  videoQuality?: VideoQuality
  guideImageUrl?: string
  debugMode?: boolean
}

const BasicModeViewer: React.FC<Props> = ({
  mediaItems,
  cameraResolution = 'fhd',
  videoQuality = 'low',
  guideImageUrl,
  debugMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

  // iOS는 muted 기본값 (자동재생 정책), Android는 unmuted 기본값
  const [isMuted, setIsMuted] = useState(isIOSDevice())
  const [isLoading, setIsLoading] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [actualCameraResolution, setActualCameraResolution] = useState<string | null>(null)
  const [loadedMediaCount, setLoadedMediaCount] = useState(0)

  // basic 모드 미디어 아이템만 필터링
  const basicModeItems = mediaItems.filter((item) => item.mode === 'basic')
  const basicModeVideoCount = basicModeItems.filter((item) => item.type === 'video').length
  const isAllVideosReady = basicModeVideoCount === 0 || loadedMediaCount >= basicModeVideoCount

  // 카메라 시작
  useEffect(() => {
    let stream: MediaStream | null = null

    const { width: cameraWidth, height: cameraHeight } = getCameraResolution(cameraResolution)
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

  // 미디어 아이템 비디오 로드 완료 핸들러
  const handleMediaVideoLoaded = useCallback(() => {
    setLoadedMediaCount((prev) => prev + 1)
  }, [])

  // 비디오 ref 등록 (일반 비디오만)
  const setVideoRef = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(id, el)
    } else {
      videoRefs.current.delete(id)
    }
  }, [])

  // 음소거 토글 - 일반 비디오에만 적용 (ChromaKeyVideo는 muted prop으로 제어)
  const handleToggleMute = useCallback(async () => {
    const newMutedState = !isMuted

    videoRefs.current.forEach(async (video) => {
      if (!newMutedState) {
        try {
          video.muted = false
          if (video.paused) {
            await video.play()
          }
        } catch (e) {
          console.warn('[BasicMode] Failed to unmute:', e)
          video.muted = true
        }
      } else {
        video.muted = true
      }
    })

    setIsMuted(newMutedState)
    console.log(`[BasicMode] Sound ${newMutedState ? 'disabled' : 'enabled'}`)
  }, [isMuted])

  // isMuted 상태 변경 시 일반 비디오에 반영
  useEffect(() => {
    videoRefs.current.forEach((video) => {
      video.muted = isMuted
    })
  }, [isMuted])

  // 가로/세로 전환 시 레이아웃 강제 갱신
  useEffect(() => {
    const handleOrientationChange = () => {
      console.log('[BasicMode] Orientation changed, forcing layout update...')
      setTimeout(() => {
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
  }, [])

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
      {basicModeVideoCount > 0 && (
        <button
          onClick={handleToggleMute}
          className="fixed top-4 right-4 z-40 flex items-center justify-center text-white transition-all active:scale-95"
          aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
        >
          <SpeakerIcon muted={isMuted} />
        </button>
      )}

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
          <span className="px-2 py-0.5 rounded bg-green-500">
            📦 {basicModeItems.length}개 미디어
          </span>
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

        {/* 안내문구 이미지 (모든 영상 로드 전까지 표시) */}
        {guideImageUrl && !isAllVideosReady && !isLoading && !cameraError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <img
              src={guideImageUrl}
              alt="안내문구"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* 미디어 아이템 순환 렌더링 */}
        {basicModeItems.map((item) => {
          const normalizedLinkUrl = normalizeUrl(item.linkUrl)
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: `${item.position.x * 100}%`,
                top: `${item.position.y * 100}%`,
                transform: `translate(-50%, -50%) scale(${item.scale})`,
                ...(!item.aspectRatio
                  ? { width: '100%', height: '100%' }
                  : item.aspectRatio < 1
                    ? { width: '100%', aspectRatio: `${item.aspectRatio}` }
                    : { height: '100%', aspectRatio: `${item.aspectRatio}` }
                ),
                pointerEvents: item.linkEnabled && normalizedLinkUrl ? 'auto' : 'none',
                zIndex: 10 + item.order,
              }}
            >
              {item.type === 'image' ? (
                item.linkEnabled && normalizedLinkUrl ? (
                  <a
                    href={normalizedLinkUrl}
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
                <ChromaKeyVideo
                  src={item.previewFileUrl || item.fileUrl}
                  chromaKeyColor={item.chromaKeyColor || '#00FF00'}
                  chromaKeySettings={item.chromaKeySettings}
                  className="w-full h-full object-contain"
                  muted={isMuted}
                  onLoadedData={handleMediaVideoLoaded}
                />
              ) : (
                <video
                  ref={(el) => setVideoRef(item.id, el)}
                  src={item.previewFileUrl || item.fileUrl}
                  loop
                  muted={isMuted}
                  playsInline
                  autoPlay
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain"
                  onLoadedData={handleMediaVideoLoaded}
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

export default BasicModeViewer
