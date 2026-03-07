import { lazy, Suspense, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ConsoleLogOverlay from './components/ConsoleLogOverlay'
import { CameraResolution, ChromaKeySettings, DEFAULT_CHROMAKEY_SETTINGS, MediaItemResponse, MediaMode, MediaType, VideoPosition, VideoQuality } from './types/project'
import { API_URL } from './config/api'

// 무거운 뷰어 컴포넌트를 조건부 lazy loading
// MindARViewer: A-Frame, Three.js, MindAR 포함 (~370KB gzipped)
// BasicModeViewer: 순수 Canvas 기반 (~15KB gzipped)
const MindARViewer = lazy(() => import('./components/MindarViewer'))
const BasicModeViewer = lazy(() => import('./components/BasicModeViewer'))

// 뷰어용 처리된 미디어 아이템 (URL 포함)
export interface ProcessedMediaItem {
  id: string
  type: MediaType
  mode: MediaMode
  fileUrl: string
  previewFileUrl?: string
  position: VideoPosition
  scale: number
  aspectRatio: number
  chromaKeyEnabled: boolean
  chromaKeyColor?: string
  chromaKeySettings: ChromaKeySettings
  flatView: boolean
  linkEnabled: boolean
  linkUrl?: string
  order: number
}

interface ArFilesResponse {
  mindFileId?: string // 트래킹 아이템 없으면 null
  targetImageFileId?: string
  thumbnailBase64?: string // 썸네일 이미지 Base64 (로딩 화면용)
  guideImageFileId?: string // 안내문구 이미지 ID
  highPrecision?: boolean
  cameraResolution?: CameraResolution // 'fhd' | 'hd'
  videoQuality?: VideoQuality // 'high' | 'medium' | 'low'
  mediaItems?: MediaItemResponse[] // 모든 미디어는 여기에 포함
}

interface ArAssets {
  mindUrl?: string // 기본 모드에서는 undefined
  targetImageUrl?: string // 기본 모드에서는 undefined
  thumbnailBase64?: string // 썸네일 이미지 Base64 data URL (로딩 화면 우선 표시)
  guideImageUrl?: string // 안내문구 이미지 URL
  mediaItems: ProcessedMediaItem[] // 모든 미디어 아이템
}

// 메타데이터 + 에셋 URL 생성
async function fetchArDataAndAssets(folderId: string): Promise<{
  fileIds: ArFilesResponse
  assets: ArAssets
}> {
  // Step 1: 메타데이터 fetch
  const res = await fetch(`${API_URL}/ar-files/${folderId}`)
  if (!res.ok) throw new Error('AR 파일 정보를 불러오지 못했습니다.')
  const fileIds: ArFilesResponse = await res.json()

  // 캐시 버스터 추가 (브라우저 HTTP 캐싱 방지)
  const cacheBuster = Date.now()

  // mind 파일과 타겟 이미지는 서버 URL을 직접 사용 (blob 변환 불필요)
  const mindUrl = fileIds.mindFileId
    ? `${API_URL}/file/${fileIds.mindFileId}?t=${cacheBuster}`
    : undefined
  const targetImageUrl = fileIds.targetImageFileId
    ? `${API_URL}/file/${fileIds.targetImageFileId}?t=${cacheBuster}`
    : undefined

  // 미디어 아이템 URL 처리
  const processedMediaItems: ProcessedMediaItem[] = (fileIds.mediaItems || [])
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      id: item.id,
      type: item.type,
      mode: item.mode,
      fileUrl: item.type === 'video'
        ? `${API_URL}/stream/${item.fileId}?t=${cacheBuster}`
        : `${API_URL}/file/${item.fileId}?t=${cacheBuster}`,
      previewFileUrl: item.previewFileId
        ? `${API_URL}/stream/${item.previewFileId}?t=${cacheBuster}`
        : undefined,
      position: {
        x: item.positionX ?? 0.5,
        y: item.positionY ?? 0.5,
      },
      scale: item.scale ?? 1,
      aspectRatio: item.aspectRatio ?? 16 / 9,
      chromaKeyEnabled: item.chromaKeyEnabled ?? false,
      chromaKeyColor: item.chromaKeyColor || undefined,
      chromaKeySettings: {
        similarity: item.chromaKeySimilarity ?? DEFAULT_CHROMAKEY_SETTINGS.similarity,
        smoothness: item.chromaKeySmoothness ?? DEFAULT_CHROMAKEY_SETTINGS.smoothness,
      },
      flatView: item.flatView,
      linkEnabled: item.linkEnabled,
      linkUrl: item.linkUrl ?? undefined,
      order: item.order,
    }))

  const guideImageUrl = fileIds.guideImageFileId
    ? `${API_URL}/file/${fileIds.guideImageFileId}?t=${cacheBuster}`
    : undefined

  // 가이드 이미지 프리로드 (카메라 준비 시 즉시 표시되도록)
  if (guideImageUrl) {
    const img = new Image()
    img.src = guideImageUrl
  }

  return {
    fileIds,
    assets: {
      mindUrl,
      targetImageUrl,
      thumbnailBase64: fileIds.thumbnailBase64 || undefined, // 이미 data URL 형식
      guideImageUrl,
      mediaItems: processedMediaItems,
    },
  }
}

// 화면 방향을 세로로 고정
function useLockPortraitOrientation() {
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        // Screen Orientation API (표준)
        const orientation = window.screen?.orientation
        if (orientation && 'lock' in orientation) {
          await orientation.lock('portrait')
          console.log('[Orientation] Locked to portrait')
        }
      } catch (e) {
        // 지원하지 않거나 권한 없음 (일부 브라우저에서는 fullscreen 필요)
        console.log('[Orientation] Lock not supported or denied:', e)
      }
    }

    lockOrientation()

    return () => {
      // 컴포넌트 언마운트 시 잠금 해제
      try {
        const orientation = window.screen?.orientation
        if (orientation && 'unlock' in orientation) {
          orientation.unlock()
        }
      } catch (e) {
        // 무시
      }
    }
  }, [])
}

// 가로 모드 경고 오버레이 (Screen Orientation API가 작동하지 않는 브라우저용 fallback)
function LandscapeWarningOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] hidden landscape:flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
      <div className="flex flex-col items-center text-center px-8">
        <div className="mb-6 text-6xl">📱</div>
        <h2 className="text-xl font-bold text-white mb-2">
          세로 모드로 전환해주세요
        </h2>
        <p className="text-white/80 text-sm">
          AR 경험은 세로 모드에서만 지원됩니다
        </p>
        <div className="mt-6 animate-bounce">
          <svg
            className="w-8 h-8 text-white rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default function MindARViewerPage() {
  const { folderId } = useParams<{ folderId: string }>()
  const [searchParams] = useSearchParams()
  const isDebugMode = searchParams.get('mode') === 'debug'
  const isLogMode = searchParams.get('mode') === 'log'

  if (!folderId) {
    throw new Error('folderId가 없습니다.')
  }

  // 화면 방향 세로 고정 (AR 앱은 세로 모드가 권장됨)
  useLockPortraitOrientation()

  // 메타데이터 + 에셋을 한 번의 쿼리로 로드
  const { data, isLoading } = useQuery({
    queryKey: ['arData', folderId],
    queryFn: () => fetchArDataAndAssets(folderId),
    staleTime: 0, // 항상 최신 데이터 fetch (영상 교체 즉시 반영)
    gcTime: 0, // 캐시 비활성화
    refetchOnMount: 'always', // 페이지 진입 시 항상 새로 fetch
    refetchOnWindowFocus: false, // 포커스 시 refetch 방지 (AR 사용 중 방해 방지)
  })

  const isReady = !isLoading && !!data

  if (!isReady) {
    return (
      <>
        <LandscapeWarningOverlay />
        <div className="flex h-[100dvh] w-full items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
          <div className="flex flex-col items-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
            <p className="text-lg font-medium text-white">AR 준비 중...</p>
          </div>
        </div>
      </>
    )
  }

  // 트래킹 모드 미디어 아이템이 하나라도 있으면 AR 모드, 없으면 기본 모드
  const hasTrackingItems = (data.fileIds.mediaItems || []).some(item => item.mode === 'tracking')
  const isBasicMode = !hasTrackingItems

  // 기본 모드: BasicModeViewer 렌더링
  if (isBasicMode) {
    // basic 모드 미디어가 하나도 없으면 에러
    const hasBasicMedia = data.assets.mediaItems.some((item) => item.mode === 'basic')
    if (!hasBasicMedia) {
      return (
        <div className="flex h-[100dvh] w-full items-center justify-center bg-red-500">
          <p className="text-white">미디어가 없습니다.</p>
        </div>
      )
    }

    return (
      <>
        <LandscapeWarningOverlay />
        <section className="relative flex h-[100dvh] w-full overflow-hidden">
          <Suspense fallback={<ViewerLoadingFallback />}>
            <BasicModeViewer
              mediaItems={data.assets.mediaItems}
              cameraResolution={data.fileIds.cameraResolution || 'fhd'}
              videoQuality={data.fileIds.videoQuality || 'low'}
              guideImageUrl={data.assets.guideImageUrl}
              debugMode={isDebugMode}
            />
          </Suspense>
          {isLogMode && <ConsoleLogOverlay />}
        </section>
      </>
    )
  }

  // AR 모드: MindARViewer 렌더링
  // tracking 모드 비디오가 하나도 없으면 에러
  const hasTrackingVideo = data.assets.mediaItems.some(
    (item) => item.type === 'video' && item.mode === 'tracking'
  )
  if (!hasTrackingVideo) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-red-500">
        <p className="text-white">비디오가 없습니다.</p>
      </div>
    )
  }

  return (
    <>
      <LandscapeWarningOverlay />
      <section className="relative flex h-[100dvh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <Suspense fallback={<ViewerLoadingFallback />}>
            <MindARViewer
              mindUrl={data.assets.mindUrl!}
              targetImageUrl={data.assets.targetImageUrl!}
              thumbnailUrl={data.assets.thumbnailBase64}
              highPrecision={data.fileIds.highPrecision}
              cameraResolution={data.fileIds.cameraResolution || 'fhd'}
              videoQuality={data.fileIds.videoQuality || 'low'}
              guideImageUrl={data.assets.guideImageUrl}
              mediaItems={data.assets.mediaItems}
              debugMode={isDebugMode}
            />
          </Suspense>
        </div>
        {isLogMode && <ConsoleLogOverlay />}
      </section>
    </>
  )
}

// Suspense 폴백 컴포넌트
function ViewerLoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
      <div className="flex flex-col items-center">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        <p className="text-sm font-medium text-white">뷰어 로딩 중...</p>
      </div>
    </div>
  )
}
