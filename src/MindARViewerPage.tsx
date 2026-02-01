import MindARViewer from './components/MindarViewer'
import BasicModeViewer from './components/BasicModeViewer'
import ConsoleLogOverlay from './components/ConsoleLogOverlay'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { CameraResolution, ProjectMode, VideoPosition } from './types/project'

const API_URL = process.env.REACT_APP_API_URL

interface ArFilesResponse {
  mindFileId?: string // 기본 모드에서는 null
  videoFileId: string
  previewVideoFileId?: string
  targetImageFileId?: string
  chromaKeyColor?: string
  flatView?: boolean
  highPrecision?: boolean
  mode?: ProjectMode // 'ar' | 'basic'
  cameraResolution?: CameraResolution // '4k' | 'fhd' | 'hd'
  videoPosition?: VideoPosition // 기본 모드용
  videoScale?: number // 기본 모드용
}

interface ArAssets {
  mindUrl?: string // 기본 모드에서는 undefined
  videoUrl: string
  previewVideoUrl?: string
  targetImageUrl?: string // 기본 모드에서는 undefined
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

  return {
    fileIds,
    assets: {
      mindUrl,
      videoUrl: `${API_URL}/stream/${fileIds.videoFileId}?t=${cacheBuster}`,
      previewVideoUrl: fileIds.previewVideoFileId
        ? `${API_URL}/stream/${fileIds.previewVideoFileId}?t=${cacheBuster}`
        : undefined,
      targetImageUrl,
    },
  }
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
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
        <div className="flex flex-col items-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
          <p className="text-lg font-medium text-white">AR 준비 중...</p>
        </div>
      </div>
    )
  }

  const isBasicMode = data.fileIds.mode === 'basic'

  // 기본 모드: BasicModeViewer 렌더링
  if (isBasicMode) {
    return (
      <section className="relative flex min-h-[100dvh] w-full">
        <BasicModeViewer
          videoUrl={data.assets.videoUrl}
          previewVideoUrl={data.assets.previewVideoUrl}
          position={data.fileIds.videoPosition || { x: 0.5, y: 0.5 }}
          scale={data.fileIds.videoScale || 1}
          chromaKeyColor={data.fileIds.chromaKeyColor}
          cameraResolution={data.fileIds.cameraResolution || 'fhd'}
        />
        {isLogMode && <ConsoleLogOverlay />}
      </section>
    )
  }

  // AR 모드: MindARViewer 렌더링
  return (
    <section className="relative flex min-h-[100dvh] w-full">
      <div className="absolute inset-0">
        <MindARViewer
          mindUrl={data.assets.mindUrl!}
          videoUrl={data.assets.videoUrl}
          previewVideoUrl={data.assets.previewVideoUrl}
          targetImageUrl={data.assets.targetImageUrl!}
          chromaKeyColor={data.fileIds.chromaKeyColor}
          flatView={data.fileIds.flatView}
          highPrecision={data.fileIds.highPrecision}
          cameraResolution={data.fileIds.cameraResolution || 'fhd'}
          debugMode={isDebugMode}
        />
      </div>
      {isLogMode && <ConsoleLogOverlay />}
    </section>
  )
}
