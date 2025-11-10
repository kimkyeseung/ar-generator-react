import MindARViewer from './components/MindarViewer'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

const API_URL = process.env.REACT_APP_API_URL

async function fetchArFiles(folderId: string) {
  const res = await fetch(`${API_URL}/ar-files/${folderId}`)
  if (!res.ok) throw new Error('AR 파일 정보를 불러오지 못했습니다.')
  return res.json() as Promise<{ mindFileId: string; videoFileId: string }>
}

async function fetchBlobUrlFromFileId(fileId: string) {
  const res = await fetch(`${API_URL}/file/${fileId}`)
  if (!res.ok) throw new Error('파일을 불러오지 못했습니다.')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export default function MindARViewerPage() {
  const { folderId } = useParams<{ folderId: string }>()

  if (!folderId) {
    throw new Error('folderId가 없습니다.')
  }

  const { data: fileIds, isLoading: isIdsLoading } = useQuery({
    queryKey: ['arFiles', folderId],
    queryFn: () => fetchArFiles(folderId),
  })

  const { data: mindUrl, isLoading: isMindLoading } = useQuery({
    queryKey: ['mindUrl', fileIds?.mindFileId],
    queryFn: () => fetchBlobUrlFromFileId(fileIds!.mindFileId),
    enabled: !!fileIds,
  })

  const { data: videoUrl, isLoading: isVideoLoading } = useQuery({
    queryKey: ['videoUrl', fileIds?.videoFileId],
    queryFn: () => fetchBlobUrlFromFileId(fileIds!.videoFileId),
    enabled: !!fileIds,
  })

  const isReady =
    !isIdsLoading && !isMindLoading && !isVideoLoading && mindUrl && videoUrl

  if (!isReady) return <p>Loading AR assets...</p>

  return (
    <section className="relative flex min-h-[100dvh] w-full">
      <div className="absolute inset-0">
        <MindARViewer mindUrl={mindUrl} videoUrl={videoUrl} />
      </div>
    </section>
  )
}
