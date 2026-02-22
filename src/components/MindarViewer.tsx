/**
 * MindAR AR 뷰어 컴포넌트
 * 타겟 이미지를 인식하여 비디오를 AR로 표시
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import 'aframe'
import '../lib/image-target/aframe.js'
import { CameraResolution, ChromaKeySettings, DEFAULT_CHROMAKEY_SETTINGS, VideoQuality } from '../types/project'
import { ProcessedMediaItem } from '../MindARViewerPage'
import { SpeakerIcon } from './ui/SpeakerIcon'
import { isIOSDevice } from '../utils/camera'
import {
  MindARScene,
  MindARSystem,
  registerAllAFrameComponents,
  useMindARScene,
  LoadingScreen,
  GuideImageOverlay,
  DebugPanel,
  BasicModeMediaItem,
} from './mindar'

// A-Frame 컴포넌트 등록 (모듈 로드 시 1회만 실행)
registerAllAFrameComponents()

// ==================== Props ====================
interface Props {
  mindUrl: string
  videoUrl: string
  previewVideoUrl?: string
  targetImageUrl: string
  chromaKeyColor?: string
  chromaKeySettings?: ChromaKeySettings
  flatView?: boolean
  highPrecision?: boolean
  cameraResolution?: CameraResolution
  videoQuality?: VideoQuality
  guideImageUrl?: string
  mediaItems?: ProcessedMediaItem[]
  debugMode?: boolean
}

// ==================== Component ====================
const MindARViewer: React.FC<Props> = ({
  mindUrl,
  videoUrl,
  previewVideoUrl,
  targetImageUrl,
  chromaKeyColor,
  chromaKeySettings = DEFAULT_CHROMAKEY_SETTINGS,
  flatView,
  cameraResolution = 'fhd',
  videoQuality = 'low',
  guideImageUrl,
  mediaItems = [],
  debugMode = false,
}) => {
  const sceneRef = useRef<MindARScene | null>(null)

  // ==================== 상태 ====================
  const [isMuted, setIsMuted] = useState(isIOSDevice())
  const [isLoading, setIsLoading] = useState(true)
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl)
  const [isHDReady, setIsHDReady] = useState(!previewVideoUrl)
  const [isMainVideoReady, setIsMainVideoReady] = useState(false)
  const [loadedMediaCount, setLoadedMediaCount] = useState(0)

  // 디버그 모드 상태
  const [videoFileSize, setVideoFileSize] = useState<number | null>(null)
  const [videoResolution, setVideoResolution] = useState<string | null>(null)
  const [stabilizationEnabled, setStabilizationEnabled] = useState(true)
  const [filterMinCF, setFilterMinCF] = useState(0.05)
  const [filterBeta, setFilterBeta] = useState(1500)

  // ==================== 계산 ====================
  const videoMediaItems = mediaItems.filter((item) => item.type === 'video')
  const basicModeItems = mediaItems.filter((item) => item.mode === 'basic')
  const isAllVideosReady = isMainVideoReady && loadedMediaCount >= videoMediaItems.length

  // ==================== 콜백 ====================
  const handleLoadingComplete = useCallback(() => setIsLoading(false), [])
  const handleMainVideoReady = useCallback(() => setIsMainVideoReady(true), [])
  const handleVideoResolutionChange = useCallback((res: string) => setVideoResolution(res), [])
  const handleMediaVideoLoaded = useCallback(() => setLoadedMediaCount((c) => c + 1), [])

  const handleToggleMute = useCallback(async () => {
    const sceneEl = sceneRef.current
    const video = sceneEl?.querySelector<HTMLVideoElement>('#ar-video')
    if (!video) return

    const newMuted = !isMuted

    if (!newMuted) {
      try {
        video.muted = false
        if (video.paused) await video.play()
        setIsMuted(false)
        console.log('[MindAR] Sound enabled')
      } catch (e) {
        console.warn('[MindAR] Failed to unmute:', e)
        video.muted = true
      }
    } else {
      video.muted = true
      setIsMuted(true)
      console.log('[MindAR] Sound disabled')
    }
  }, [isMuted])

  // ==================== MindAR 씬 훅 ====================
  useMindARScene({
    sceneRef,
    targetImageUrl,
    onLoadingComplete: handleLoadingComplete,
    onMainVideoReady: handleMainVideoReady,
    onVideoResolutionChange: handleVideoResolutionChange,
  })

  // ==================== Effects ====================

  // props 변경 시 상태 리셋
  useEffect(() => {
    setCurrentVideoUrl(videoUrl)
    setIsHDReady(true)
  }, [videoUrl])

  // 디버그 모드: 비디오 파일 크기 가져오기
  useEffect(() => {
    if (!debugMode) return

    fetch(currentVideoUrl, { method: 'HEAD' })
      .then((res) => {
        const length = res.headers.get('Content-Length')
        if (length) setVideoFileSize(parseInt(length, 10))
      })
      .catch((e) => console.warn('[MindAR] Failed to fetch video size:', e))
  }, [debugMode, currentVideoUrl])

  // 디버그 모드: 필터 파라미터 실시간 업데이트
  useEffect(() => {
    if (!debugMode) return

    const sceneEl = sceneRef.current
    const arSystem = sceneEl?.systems?.['mindar-image-system'] as MindARSystem | undefined
    if (!arSystem?.controller) return

    const { controller } = arSystem
    const newMinCF = stabilizationEnabled ? filterMinCF : 1000
    const newBeta = stabilizationEnabled ? filterBeta : 0

    controller.filterMinCF = newMinCF
    controller.filterBeta = newBeta

    controller.trackingStates?.forEach((state) => {
      if (state.filter) {
        state.filter.minCutOff = newMinCF
        state.filter.beta = newBeta
      }
    })

    console.log('[Debug] Filter updated:', { stabilizationEnabled, minCutOff: newMinCF, beta: newBeta })
  }, [debugMode, stabilizationEnabled, filterMinCF, filterBeta])

  // HD 비디오 백그라운드 프리로드
  useEffect(() => {
    if (!previewVideoUrl || isHDReady) return

    console.log('[MindAR] Preloading HD video in background...')
    const hdVideo = document.createElement('video')
    hdVideo.preload = 'auto'
    hdVideo.muted = true
    hdVideo.playsInline = true
    hdVideo.crossOrigin = 'anonymous'
    hdVideo.src = videoUrl

    const handleCanPlay = () => {
      console.log('[MindAR] HD video ready, switching source...')
      setIsHDReady(true)
      setCurrentVideoUrl(videoUrl)
    }

    hdVideo.addEventListener('canplaythrough', handleCanPlay, { once: true })
    hdVideo.load()

    return () => {
      hdVideo.removeEventListener('canplaythrough', handleCanPlay)
      hdVideo.pause()
      hdVideo.src = ''
      hdVideo.load()
    }
  }, [videoUrl, previewVideoUrl, isHDReady])

  // 비디오 소스 변경 시 업데이트
  useEffect(() => {
    const video = sceneRef.current?.querySelector<HTMLVideoElement>('#ar-video')
    if (!video || video.src === currentVideoUrl) return

    const currentTime = video.currentTime
    const wasPlaying = !video.paused

    console.log('[MindAR] Switching video source to:', currentVideoUrl.includes('preview') ? 'preview' : 'HD')
    video.pause()
    video.src = currentVideoUrl

    const handleCanPlay = () => {
      video.currentTime = currentTime
      if (wasPlaying) video.play().catch(() => {})
      video.removeEventListener('canplaythrough', handleCanPlay)
    }

    video.addEventListener('canplaythrough', handleCanPlay)
    video.load()
  }, [currentVideoUrl])

  // ==================== A-Frame 설정 ====================
  const mindARImageConfig = [
    `imageTargetSrc: ${mindUrl}`,
    'autoStart: false',
    'uiLoading: no',
    'uiError: no',
    'uiScanning: no',
    `cameraResolution: ${cameraResolution}`,
    stabilizationEnabled && `filterMinCF: ${filterMinCF}`,
    stabilizationEnabled && `filterBeta: ${filterBeta}`,
  ].filter(Boolean).join('; ')

  // ==================== Render ====================
  return (
    <>
      {/* 로딩 화면 */}
      {isLoading && <LoadingScreen targetImageUrl={targetImageUrl} />}

      {/* 안내문구 이미지 */}
      {guideImageUrl && !isAllVideosReady && !isLoading && (
        <GuideImageOverlay imageUrl={guideImageUrl} />
      )}

      {/* 스피커 토글 버튼 */}
      <button
        onClick={handleToggleMute}
        className="fixed top-4 right-4 z-40 flex items-center justify-center text-white transition-all active:scale-95"
        aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
      >
        <SpeakerIcon muted={isMuted} />
      </button>

      {/* 기본 모드 미디어 아이템 */}
      {basicModeItems.map((item) => (
        <BasicModeMediaItem
          key={item.id}
          item={item}
          onVideoLoaded={handleMediaVideoLoaded}
        />
      ))}

      {/* 디버그 패널 */}
      {debugMode && (
        <DebugPanel
          cameraResolution={cameraResolution}
          videoQuality={videoQuality}
          isHDReady={isHDReady}
          hasPreviewVideo={!!previewVideoUrl}
          videoResolution={videoResolution}
          videoFileSize={videoFileSize}
          stabilizationEnabled={stabilizationEnabled}
          filterMinCF={filterMinCF}
          filterBeta={filterBeta}
          onToggleStabilization={() => setStabilizationEnabled(!stabilizationEnabled)}
          onFilterMinCFChange={setFilterMinCF}
          onFilterBetaChange={setFilterBeta}
        />
      )}

      {/* A-Frame 씬 */}
      <a-scene
        className="h-full w-full"
        style={{ width: '100%', height: '100%' }}
        ref={sceneRef}
        mindar-image={mindARImageConfig}
        assettimeout="15000"
        color-space="sRGB"
        embedded
        renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
      >
        <a-assets>
          <video
            id="ar-video"
            src={currentVideoUrl}
            loop
            crossOrigin="anonymous"
            playsInline
            webkit-playsinline="true"
            muted={isMuted}
            preload="auto"
            autoPlay
            onLoadedData={() => {
              console.log('[MindAR] Main video loaded via onLoadedData')
              setIsMainVideoReady(true)
            }}
          />
        </a-assets>

        <a-camera position="0 0 0" look-controls="enabled: false" />

        <a-entity mindar-image-target="targetIndex: 0">
          {chromaKeyColor ? (
            <a-plane
              position="0 0 0"
              height="1"
              width="1"
              rotation="0 0 0"
              chromakey-material={`src: #ar-video; color: ${chromaKeyColor}; similarity: ${chromaKeySettings.similarity}; smoothness: ${chromaKeySettings.smoothness}`}
              {...(flatView ? { billboard: '' } : {})}
            />
          ) : (
            <a-video
              src="#ar-video"
              position="0 0 0"
              height="1"
              width="1"
              rotation="0 0 0"
              loop="true"
              muted={isMuted ? 'true' : 'false'}
              autoplay="true"
              playsinline="true"
              {...(flatView ? { billboard: '' } : {})}
            />
          )}
        </a-entity>
      </a-scene>
    </>
  )
}

export default MindARViewer
