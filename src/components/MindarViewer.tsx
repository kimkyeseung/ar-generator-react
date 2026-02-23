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
  targetImageUrl: string
  thumbnailUrl?: string // 로딩 화면용 썸네일 (없으면 targetImageUrl 사용)
  highPrecision?: boolean
  cameraResolution?: CameraResolution
  videoQuality?: VideoQuality
  guideImageUrl?: string
  mediaItems?: ProcessedMediaItem[] // 모든 미디어 아이템 (tracking + basic)
  debugMode?: boolean
}

// Tracking 모드 비디오를 A-Frame 씬에서 렌더링하기 위한 컴포넌트
interface TrackingVideoEntityProps {
  item: ProcessedMediaItem
  videoId: string
  isMuted: boolean
}

function TrackingVideoEntity({ item, videoId, isMuted }: TrackingVideoEntityProps) {
  // position과 scale을 A-Frame 좌표로 변환
  // position.x, position.y는 0~1 범위 (화면 비율)
  // A-Frame에서는 중앙이 0,0이고 타겟 이미지 크기가 width=1
  const posX = (item.position.x - 0.5) * 1 // -0.5 ~ 0.5 범위
  const posY = (0.5 - item.position.y) * 1 // Y축 반전
  const posZ = 0.001 * (item.order + 1) // Z-fighting 방지를 위해 약간 앞으로

  // 비디오 크기 계산 (scale 적용)
  const videoWidth = item.scale
  const videoHeight = item.scale / item.aspectRatio

  if (item.chromaKeyEnabled && item.chromaKeyColor) {
    return (
      <a-plane
        position={`${posX} ${posY} ${posZ}`}
        width={videoWidth.toString()}
        height={videoHeight.toString()}
        rotation="0 0 0"
        chromakey-material={`src: #${videoId}; color: ${item.chromaKeyColor}; similarity: ${item.chromaKeySettings.similarity}; smoothness: ${item.chromaKeySettings.smoothness}`}
        {...(item.flatView ? { billboard: '' } : {})}
      />
    )
  }

  return (
    <a-video
      src={`#${videoId}`}
      position={`${posX} ${posY} ${posZ}`}
      width={videoWidth.toString()}
      height={videoHeight.toString()}
      rotation="0 0 0"
      loop="true"
      muted={isMuted ? 'true' : 'false'}
      autoplay="true"
      playsinline="true"
      {...(item.flatView ? { billboard: '' } : {})}
    />
  )
}

// ==================== Component ====================
const MindARViewer: React.FC<Props> = ({
  mindUrl,
  targetImageUrl,
  thumbnailUrl,
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
  const [loadedVideoCount, setLoadedVideoCount] = useState(0)

  // 디버그 모드 상태
  const [videoFileSize, setVideoFileSize] = useState<number | null>(null)
  const [videoResolution, setVideoResolution] = useState<string | null>(null)
  const [stabilizationEnabled, setStabilizationEnabled] = useState(true)
  const [filterMinCF, setFilterMinCF] = useState(0.05)
  const [filterBeta, setFilterBeta] = useState(1500)

  // ==================== 계산 ====================
  const basicModeItems = mediaItems.filter((item) => item.mode === 'basic')
  // tracking 모드 비디오 (order 순서대로)
  const trackingModeVideos = mediaItems
    .filter((item) => item.mode === 'tracking' && item.type === 'video')
    .sort((a, b) => a.order - b.order)
  // basic 모드 비디오 개수
  const basicModeVideoCount = basicModeItems.filter((item) => item.type === 'video').length
  // tracking 모드 비디오 개수
  const trackingModeVideoCount = trackingModeVideos.length
  // 모든 비디오가 로드되었는지 확인
  const totalVideoCount = basicModeVideoCount + trackingModeVideoCount
  const isAllVideosReady = loadedVideoCount >= totalVideoCount

  // ==================== 콜백 ====================
  const handleLoadingComplete = useCallback(() => setIsLoading(false), [])
  const handleVideoResolutionChange = useCallback((res: string) => setVideoResolution(res), [])
  const handleVideoLoaded = useCallback(() => setLoadedVideoCount((c) => c + 1), [])

  const handleToggleMute = useCallback(async () => {
    const sceneEl = sceneRef.current
    // 모든 AR 비디오의 음소거 토글
    const allVideos = sceneEl?.querySelectorAll<HTMLVideoElement>('video[id^="ar-video"]')
    if (!allVideos || allVideos.length === 0) return

    const newMuted = !isMuted

    allVideos.forEach(async (video) => {
      if (!newMuted) {
        try {
          video.muted = false
          if (video.paused) await video.play()
        } catch (e) {
          console.warn(`[MindAR] Failed to unmute ${video.id}:`, e)
          video.muted = true
        }
      } else {
        video.muted = true
      }
    })

    setIsMuted(newMuted)
    console.log(`[MindAR] Sound ${newMuted ? 'disabled' : 'enabled'}`)
  }, [isMuted])

  // ==================== MindAR 씬 훅 ====================
  useMindARScene({
    sceneRef,
    targetImageUrl,
    onLoadingComplete: handleLoadingComplete,
    onMainVideoReady: handleVideoLoaded, // 첫 번째 비디오 로드 시 호출
    onVideoResolutionChange: handleVideoResolutionChange,
  })

  // ==================== Effects ====================

  // 디버그 모드: 첫 번째 tracking 비디오 파일 크기 가져오기
  useEffect(() => {
    if (!debugMode || trackingModeVideos.length === 0) return

    const firstVideo = trackingModeVideos[0]
    const videoUrl = firstVideo.previewFileUrl || firstVideo.fileUrl

    fetch(videoUrl, { method: 'HEAD' })
      .then((res) => {
        const length = res.headers.get('Content-Length')
        if (length) setVideoFileSize(parseInt(length, 10))
      })
      .catch((e) => console.warn('[MindAR] Failed to fetch video size:', e))
  }, [debugMode, trackingModeVideos])

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
      {isLoading && <LoadingScreen targetImageUrl={targetImageUrl} thumbnailUrl={thumbnailUrl} />}

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
          onVideoLoaded={handleVideoLoaded}
          isMuted={isMuted}
        />
      ))}

      {/* 디버그 패널 */}
      {debugMode && (
        <DebugPanel
          cameraResolution={cameraResolution}
          videoQuality={videoQuality}
          isHDReady={true}
          hasPreviewVideo={false}
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
          {/* 모든 tracking 모드 비디오들 */}
          {trackingModeVideos.map((item) => (
            <video
              key={item.id}
              id={`ar-video-${item.id}`}
              src={item.previewFileUrl || item.fileUrl}
              loop
              crossOrigin="anonymous"
              playsInline
              webkit-playsinline="true"
              muted={isMuted}
              preload="auto"
              autoPlay
              onLoadedData={() => {
                console.log(`[MindAR] Tracking video ${item.id} loaded`)
                setLoadedVideoCount((c) => c + 1)
              }}
            />
          ))}
        </a-assets>

        <a-camera position="0 0 0" look-controls="enabled: false" />

        <a-entity mindar-image-target="targetIndex: 0">
          {/* 모든 tracking 모드 비디오들 (order 순서대로 렌더링) */}
          {trackingModeVideos.map((item) => (
            <TrackingVideoEntity
              key={item.id}
              item={item}
              videoId={`ar-video-${item.id}`}
              isMuted={isMuted}
            />
          ))}
        </a-entity>
      </a-scene>
    </>
  )
}

export default MindARViewer
