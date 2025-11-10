import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import MindARViewer from './components/MindarViewer'

const API_URL = process.env.REACT_APP_API_URL

if (!API_URL) {
  throw new Error('REACT_APP_API_URL가 설정되어 있지 않습니다.')
}

type ArFileIds = {
  mindFileId: string
  videoFileId: string
}

const buildApiUrl = (path: string) => `${API_URL}${path}`

async function fetchJson<T>(path: string, errorMessage: string): Promise<T> {
  const res = await fetch(buildApiUrl(path))
  if (!res.ok) throw new Error(errorMessage)
  return (await res.json()) as T
}

async function fetchArFiles(folderId: string) {
  return fetchJson<ArFileIds>(
    `/ar-files/${folderId}`,
    'AR 파일 정보를 불러오지 못했습니다.'
  )
}

async function fetchBlobUrlFromFileId(fileId: string) {
  const res = await fetch(buildApiUrl(`/file/${fileId}`))
  if (!res.ok) throw new Error('파일을 불러오지 못했습니다.')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

const buildVideoStreamUrl = (fileId: string) => buildApiUrl(`/stream/${fileId}`)

type UseArAssetsResult = {
  mindUrl: string | null
  videoUrl: string | null
  isLoading: boolean
  isReady: boolean
  error: unknown
}

function useArAssets(folderId: string): UseArAssetsResult {
  const arFilesQuery = useQuery({
    queryKey: ['arFiles', folderId],
    queryFn: () => fetchArFiles(folderId),
  })

  const mindFileId = arFilesQuery.data?.mindFileId
  const videoFileId = arFilesQuery.data?.videoFileId

  const mindQuery = useQuery({
    queryKey: ['mindUrl', mindFileId],
    queryFn: () => fetchBlobUrlFromFileId(mindFileId!),
    enabled: Boolean(mindFileId),
  })

  const videoQuery = useQuery({
    queryKey: ['videoStreamUrl', videoFileId],
    queryFn: () => buildVideoStreamUrl(videoFileId!),
    enabled: Boolean(videoFileId),
  })

  const isLoading =
    arFilesQuery.isLoading || mindQuery.isLoading || videoQuery.isLoading
  const error =
    arFilesQuery.error ?? mindQuery.error ?? videoQuery.error ?? null
  const isReady = Boolean(mindQuery.data && videoQuery.data)

  return {
    mindUrl: mindQuery.data ?? null,
    videoUrl: videoQuery.data ?? null,
    isLoading,
    isReady,
    error,
  }
}

export default function MindARViewerPage() {
  const { folderId } = useParams<{ folderId: string }>()

  if (!folderId) {
    throw new Error('folderId가 없습니다.')
  }

  const { mindUrl, videoUrl, isLoading, isReady, error } = useArAssets(folderId)

  if (error) {
    return <p>AR assets를 불러오지 못했습니다.</p>
  }

  if (!isReady || isLoading || !mindUrl || !videoUrl)
    return <p>Loading AR assets...</p>

  return (
    <section className='relative flex min-h-[100dvh] w-full'>
      <div className='absolute inset-0'>
        <MindARViewer mindUrl={mindUrl} videoUrl={videoUrl} />
      </div>
    </section>
  )
}
