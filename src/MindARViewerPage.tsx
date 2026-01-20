import MindARViewer from './components/MindarViewer'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const API_URL = process.env.REACT_APP_API_URL

interface ArFilesResponse {
  mindFileId: string
  videoFileId: string
  previewVideoFileId?: string
  targetImageFileId?: string
  chromaKeyColor?: string
  flatView?: boolean
  highPrecision?: boolean
}

interface ArAssets {
  mindUrl: string
  videoUrl: string
  previewVideoUrl?: string
  targetImageUrl: string
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

  // Step 2: 모든 에셋을 병렬 로드
  const [mindUrl, targetImageUrl] = await Promise.all([
    fetchBlobUrlFromFileId(fileIds.mindFileId),
    fileIds.targetImageFileId
      ? fetchBlobUrlFromFileId(fileIds.targetImageFileId)
      : Promise.resolve(''),
  ])

  return {
    fileIds,
    assets: {
      mindUrl,
      // 프리뷰가 있으면 프리뷰 URL, 없으면 원본 URL
      videoUrl: `${API_URL}/stream/${fileIds.videoFileId}`,
      previewVideoUrl: fileIds.previewVideoFileId
        ? `${API_URL}/stream/${fileIds.previewVideoFileId}`
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

  if (!folderId) {
    throw new Error('folderId가 없습니다.')
  }

  // 카메라 권한 미리 요청 (에셋 로딩과 병렬)
  const cameraReady = usePrefetchCamera()

  // 메타데이터 + 에셋을 한 번의 쿼리로 로드
  const { data, isLoading } = useQuery({
    queryKey: ['arData', folderId],
    queryFn: () => fetchArDataAndAssets(folderId),
    staleTime: 1000 * 60 * 5, // 5분간 캐시
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

  return (
    <section className="relative flex min-h-[100dvh] w-full">
      <div className="absolute inset-0">
        <MindARViewer
          mindUrl={data.assets.mindUrl}
          videoUrl={data.assets.videoUrl}
          previewVideoUrl={data.assets.previewVideoUrl}
          targetImageUrl={data.assets.targetImageUrl}
          chromaKeyColor={data.fileIds.chromaKeyColor}
          flatView={data.fileIds.flatView}
          highPrecision={data.fileIds.highPrecision}
          debugMode={isDebugMode}
        />
      </div>
    </section>
  )
}
