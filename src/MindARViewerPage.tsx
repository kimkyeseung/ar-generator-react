import MindARViewer from './components/MindarViewer'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

const API_URL = process.env.REACT_APP_API_URL

interface ArFilesResponse {
  mindFileId: string
  videoFileId: string
  targetImageFileId?: string
  chromaKeyColor?: string
  flatView?: boolean
}

interface ArAssets {
  mindUrl: string
  videoUrl: string
  targetImageUrl: string
}

async function fetchArFiles(folderId: string): Promise<ArFilesResponse> {
  const res = await fetch(`${API_URL}/ar-files/${folderId}`)
  if (!res.ok) throw new Error('AR 파일 정보를 불러오지 못했습니다.')
  return res.json()
}

async function fetchBlobUrlFromFileId(fileId: string): Promise<string> {
  const res = await fetch(`${API_URL}/file/${fileId}`)
  if (!res.ok) throw new Error('파일을 불러오지 못했습니다.')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

// 모든 에셋을 병렬로 로드
async function fetchAllAssets(fileIds: ArFilesResponse): Promise<ArAssets> {
  const [mindUrl, videoUrl, targetImageUrl] = await Promise.all([
    fetchBlobUrlFromFileId(fileIds.mindFileId),
    // 비디오는 스트리밍 URL 사용 (메모리 절약 + 빠른 재생 시작)
    Promise.resolve(`${API_URL}/stream/${fileIds.videoFileId}`),
    fileIds.targetImageFileId
      ? fetchBlobUrlFromFileId(fileIds.targetImageFileId)
      : Promise.resolve(''),
  ])

  return { mindUrl, videoUrl, targetImageUrl }
}

export default function MindARViewerPage() {
  const { folderId } = useParams<{ folderId: string }>()

  if (!folderId) {
    throw new Error('folderId가 없습니다.')
  }

  // Step 1: AR 파일 메타데이터 로드
  const { data: fileIds, isLoading: isIdsLoading } = useQuery({
    queryKey: ['arFiles', folderId],
    queryFn: () => fetchArFiles(folderId),
  })

  // Step 2: 모든 에셋을 병렬로 로드 (순차 로딩 대신)
  const { data: assets, isLoading: isAssetsLoading } = useQuery({
    queryKey: ['arAssets', fileIds?.mindFileId, fileIds?.videoFileId],
    queryFn: () => fetchAllAssets(fileIds!),
    enabled: !!fileIds,
  })

  const isReady = !isIdsLoading && !isAssetsLoading && assets

  if (!isReady) return <p>Loading AR assets...</p>

  return (
    <section className="relative flex min-h-[100dvh] w-full">
      <div className="absolute inset-0">
        <MindARViewer
          mindUrl={assets.mindUrl}
          videoUrl={assets.videoUrl}
          targetImageUrl={assets.targetImageUrl}
          chromaKeyColor={fileIds?.chromaKeyColor}
          flatView={fileIds?.flatView}
        />
      </div>
    </section>
  )
}
