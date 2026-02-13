import MindARViewer from './components/MindarViewer'
import BasicModeViewer from './components/BasicModeViewer'
import ConsoleLogOverlay from './components/ConsoleLogOverlay'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { CameraResolution, ChromaKeySettings, DEFAULT_CHROMAKEY_SETTINGS, MediaItemResponse, MediaMode, MediaType, ProjectMode, VideoPosition, VideoQuality } from './types/project'
import { API_URL } from './config/api'

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
  mindFileId?: string // 기본 모드에서는 null
  videoFileId: string
  previewVideoFileId?: string
  targetImageFileId?: string
  overlayImageFileId?: string // 오버레이 이미지 ID
  overlayLinkUrl?: string // 오버레이 이미지 클릭 시 열릴 URL
  guideImageFileId?: string // 안내문구 이미지 ID
  chromaKeyColor?: string
  chromaKeySimilarity?: number // 크로마키 색상 범위 (0.0~1.0)
  chromaKeySmoothness?: number // 크로마키 경계 부드러움 (0.0~0.5)
  flatView?: boolean
  highPrecision?: boolean
  mode?: ProjectMode // 'ar' | 'basic'
  cameraResolution?: CameraResolution // '4k' | 'fhd' | 'hd'
  videoQuality?: VideoQuality // 'high' | 'medium' | 'low'
  videoPosition?: VideoPosition // 기본 모드용
  videoScale?: number // 기본 모드용
  mediaItems?: MediaItemResponse[] // 멀티 미디어 아이템
}

interface ArAssets {
  mindUrl?: string // 기본 모드에서는 undefined
  videoUrl: string
  previewVideoUrl?: string
  targetImageUrl?: string // 기본 모드에서는 undefined
  overlayImageUrl?: string // 오버레이 이미지 URL
  guideImageUrl?: string // 안내문구 이미지 URL
  mediaItems: ProcessedMediaItem[] // 멀티 미디어 아이템
}

// 단일 fetch + blob 변환
async function fetchBlobUrlFromFileId(fileId: string): Promise<string> {
  const res = await fetch(`${API_URL}/file/${fileId}`)
  if (!res.ok) throw new Error('파일을 불러오지 못했습니다.')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

// 메타데이터 + 모든 에셋을 한 번에 로드 (병렬)
async function fetchArDataAndAssets(folderId: string): Promise<{
  fileIds: ArFilesResponse
  assets: ArAssets
}> {
  // Step 1: 메타데이터 fetch
  const res = await fetch(`${API_URL}/ar-files/${folderId}`)
  if (!res.ok) throw new Error('AR 파일 정보를 불러오지 못했습니다.')
  const fileIds: ArFilesResponse = await res.json()

  // 기본 모드: .mind 파일과 타겟 이미지 불필요
  const isBasicMode = fileIds.mode === 'basic'

  // Step 2: 에셋 로드 (모드에 따라 다름)
  let mindUrl: string | undefined
  let targetImageUrl: string | undefined

  if (!isBasicMode && fileIds.mindFileId) {
    // AR 모드: mind 파일과 타겟 이미지 로드
    const [mind, target] = await Promise.all([
      fetchBlobUrlFromFileId(fileIds.mindFileId),
      fileIds.targetImageFileId
        ? fetchBlobUrlFromFileId(fileIds.targetImageFileId)
        : Promise.resolve(undefined),
    ])
    mindUrl = mind
    targetImageUrl = target
  }

  // 캐시 버스터 추가 (브라우저 HTTP 캐싱 방지)
  const cacheBuster = Date.now()

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

  return {
    fileIds,
    assets: {
      mindUrl,
      videoUrl: `${API_URL}/stream/${fileIds.videoFileId}?t=${cacheBuster}`,
      previewVideoUrl: fileIds.previewVideoFileId
        ? `${API_URL}/stream/${fileIds.previewVideoFileId}?t=${cacheBuster}`
        : undefined,
      targetImageUrl,
      overlayImageUrl: fileIds.overlayImageFileId
        ? `${API_URL}/file/${fileIds.overlayImageFileId}?t=${cacheBuster}`
        : undefined,
      guideImageUrl: fileIds.guideImageFileId
        ? `${API_URL}/file/${fileIds.guideImageFileId}?t=${cacheBuster}`
        : undefined,
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

// 카메라 권한을 미리 요청
function usePrefetchCamera() {
  const [cameraReady, setCameraReady] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s
        setCameraReady(true)
        // 스트림은 MindAR이 다시 요청하므로 즉시 해제
        stream.getTracks().forEach((t) => t.stop())
      })
      .catch(() => {
        // 권한 거부해도 MindAR이 다시 요청함
        setCameraReady(true)
      })

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return cameraReady
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

  // 카메라 권한 미리 요청 (에셋 로딩과 병렬)
  const cameraReady = usePrefetchCamera()

  // 메타데이터 + 에셋을 한 번의 쿼리로 로드
  const { data, isLoading } = useQuery({
    queryKey: ['arData', folderId],
    queryFn: () => fetchArDataAndAssets(folderId),
    staleTime: 0, // 항상 최신 데이터 fetch (영상 교체 즉시 반영)
    gcTime: 0, // 캐시 비활성화
    refetchOnMount: 'always', // 페이지 진입 시 항상 새로 fetch
    refetchOnWindowFocus: false, // 포커스 시 refetch 방지 (AR 사용 중 방해 방지)
  })

  // 에셋 + 카메라 모두 준비될 때까지 대기
  const isReady = !isLoading && data && cameraReady

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

  const isBasicMode = data.fileIds.mode === 'basic'

  // 기본 모드: BasicModeViewer 렌더링
  if (isBasicMode) {
    return (
      <>
        <LandscapeWarningOverlay />
        <section className="relative flex h-[100dvh] w-full overflow-hidden">
          <BasicModeViewer
            videoUrl={data.assets.videoUrl}
            previewVideoUrl={data.assets.previewVideoUrl}
            position={data.fileIds.videoPosition || { x: 0.5, y: 0.5 }}
            scale={data.fileIds.videoScale || 1}
            chromaKeyColor={data.fileIds.chromaKeyColor}
            chromaKeySettings={{
              similarity: data.fileIds.chromaKeySimilarity ?? DEFAULT_CHROMAKEY_SETTINGS.similarity,
              smoothness: data.fileIds.chromaKeySmoothness ?? DEFAULT_CHROMAKEY_SETTINGS.smoothness,
            }}
            cameraResolution={data.fileIds.cameraResolution || 'fhd'}
            videoQuality={data.fileIds.videoQuality || 'low'}
            overlayImageUrl={data.assets.overlayImageUrl}
            overlayLinkUrl={data.fileIds.overlayLinkUrl}
            guideImageUrl={data.assets.guideImageUrl}
            mediaItems={data.assets.mediaItems}
            debugMode={isDebugMode}
          />
          {isLogMode && <ConsoleLogOverlay />}
        </section>
      </>
    )
  }

  // AR 모드: MindARViewer 렌더링
  return (
    <>
      <LandscapeWarningOverlay />
      <section className="relative flex h-[100dvh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <MindARViewer
            mindUrl={data.assets.mindUrl!}
            videoUrl={data.assets.videoUrl}
            previewVideoUrl={data.assets.previewVideoUrl}
            targetImageUrl={data.assets.targetImageUrl!}
            chromaKeyColor={data.fileIds.chromaKeyColor}
            chromaKeySettings={{
              similarity: data.fileIds.chromaKeySimilarity ?? DEFAULT_CHROMAKEY_SETTINGS.similarity,
              smoothness: data.fileIds.chromaKeySmoothness ?? DEFAULT_CHROMAKEY_SETTINGS.smoothness,
            }}
            flatView={data.fileIds.flatView}
            highPrecision={data.fileIds.highPrecision}
            cameraResolution={data.fileIds.cameraResolution || 'fhd'}
            videoQuality={data.fileIds.videoQuality || 'low'}
            overlayImageUrl={data.assets.overlayImageUrl}
            overlayLinkUrl={data.fileIds.overlayLinkUrl}
            guideImageUrl={data.assets.guideImageUrl}
            mediaItems={data.assets.mediaItems}
            debugMode={isDebugMode}
          />
        </div>
        {isLogMode && <ConsoleLogOverlay />}
      </section>
    </>
  )
}
