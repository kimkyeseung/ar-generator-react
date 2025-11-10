import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import lottie, { RendererType, type AnimationItem } from 'lottie-web'
import { useParams } from 'react-router-dom'
import { parseDotLottie } from './lib/dotlottie'
import type { ArMediaAsset } from './types/ar-media'

const API_URL = process.env.REACT_APP_API_URL

if (!API_URL) {
  throw new Error('REACT_APP_API_URL가 설정되어 있지 않습니다.')
}

const buildApiUrl = (path: string) => `${API_URL}${path}`

type VideoFileMeta = {
  id: string
  mimeType?: string | null
  extension?: string | null
  name?: string | null
}

type ArFilesResponse = {
  mindFileId: string
  videoFile: VideoFileMeta
}

async function fetchJson<T>(path: string, errorMessage: string): Promise<T> {
  const res = await fetch(buildApiUrl(path))
  if (!res.ok) throw new Error(errorMessage)
  return (await res.json()) as T
}

async function fetchBlobFromFileId(fileId: string) {
  const res = await fetch(buildApiUrl(`/file/${fileId}`))
  if (!res.ok) throw new Error('파일을 불러오지 못했습니다.')
  return res.blob()
}

async function fetchArFiles(folderId: string) {
  return fetchJson<ArFilesResponse>(
    `/ar-files/${folderId}`,
    'AR 파일 정보를 불러오지 못했습니다.'
  )
}

async function fetchMindBlobUrl(fileId: string) {
  const blob = await fetchBlobFromFileId(fileId)
  return URL.createObjectURL(blob)
}

const getNormalizedExtension = (meta: VideoFileMeta) =>
  meta.extension?.toLowerCase() ?? ''

async function fetchMediaAsset(meta: VideoFileMeta): Promise<ArMediaAsset> {
  const extension = getNormalizedExtension(meta)

  if (extension === 'lottie') {
    const arrayBuffer = await fetch(buildApiUrl(`/file/${meta.id}`)).then(
      (res) => {
        if (!res.ok) throw new Error('Lottie 파일을 불러오지 못했습니다.')
        return res.arrayBuffer()
      }
    )
    return {
      kind: 'lottie',
      animation: parseDotLottie(arrayBuffer),
    }
  }

  if (extension === 'json') {
    const blob = await fetchBlobFromFileId(meta.id)
    const text = await blob.text()
    const animationData = JSON.parse(text)
    const width = animationData.w ?? 1
    const height = animationData.h ?? 1
    return {
      kind: 'lottie',
      animation: { animationData, width, height },
    }
  }

  const blob = await fetchBlobFromFileId(meta.id)
  const url = URL.createObjectURL(blob)
  return { kind: 'video', url }
}

export default function TestPage() {
  const { folderId } = useParams<{ folderId: string }>()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lottieCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lottieInstanceRef = useRef<AnimationItem | null>(null)
  const container = useRef<HTMLDivElement | null>(null)

  if (!folderId) {
    throw new Error('folderId가 없습니다.')
  }

  const {
    data: fileInfo,
    isLoading: isIdsLoading,
    error: idsError,
  } = useQuery({
    queryKey: ['arFiles', folderId],
    queryFn: () => fetchArFiles(folderId),
  })

  const mindQuery = useQuery({
    queryKey: ['mindUrl', fileInfo?.mindFileId],
    queryFn: () => fetchMindBlobUrl(fileInfo!.mindFileId),
    enabled: Boolean(fileInfo?.mindFileId),
  })

  const mediaQuery = useQuery({
    queryKey: ['mediaAsset', fileInfo?.videoFile.id],
    queryFn: () => fetchMediaAsset(fileInfo!.videoFile),
    enabled: Boolean(fileInfo?.videoFile?.id),
  })

  useEffect(() => {
    return () => {
      const media = mediaQuery.data
      if (media?.kind === 'video') {
        URL.revokeObjectURL(media.url)
      }
    }
  }, [mediaQuery.data])

  useEffect(() => {
    return () => {
      const mind = mindQuery.data
      if (mind) {
        URL.revokeObjectURL(mind)
      }
    }
  }, [mindQuery.data])

  useEffect(() => {
    if (mediaQuery.data?.kind !== 'video') return
    const node = videoRef.current
    if (!node) return
    const play = async () => {
      try {
        await node.play()
      } catch (err) {
        console.warn('[TestPage] autoplay blocked', err)
      }
    }
    void play()
  }, [mediaQuery.data])

  useEffect(() => {
    if (mediaQuery.data?.kind !== 'lottie') {
      lottieInstanceRef.current?.destroy()
      lottieInstanceRef.current = null
      return
    }

    const canvas = lottieCanvasRef.current
    if (!container.current) {
      return
    }
    if (!canvas) return

    canvas.width = mediaQuery.data.animation.width
    canvas.height = mediaQuery.data.animation.height

    const animationConfig = {
      container: container.current,
      animationData: mediaQuery.data.animation.animationData,
      renderer: 'canvas' as RendererType,
      autoplay: true,
      loop: true,
      rendererSettings: {
        context: canvas.getContext('2d') ?? undefined,
        clearCanvas: true,
        preserveAspectRatio: 'xMidYMid meet',
      },
    }
    const animation = lottie.loadAnimation(animationConfig)
    lottieInstanceRef.current = animation

    return () => {
      animation.destroy()
      lottieInstanceRef.current = null
    }
  }, [mediaQuery.data])

  const isReady = Boolean(mindQuery.data && mediaQuery.data)
  const isLoading =
    isIdsLoading || mindQuery.isLoading || mediaQuery.isLoading || !isReady
  const error = idsError || mindQuery.error || mediaQuery.error

  if (error) {
    return <p>AR assets를 불러오지 못했습니다.</p>
  }

  if (isLoading || !mindQuery.data || !mediaQuery.data) {
    return <p>Loading AR assets...</p>
  }

  const videoMeta = fileInfo?.videoFile

  return (
    <section className='flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10'>
      <div className='w-full max-w-3xl space-y-6 rounded-2xl bg-white p-8 shadow-2xl'>
        <header className='space-y-1'>
          <p className='text-sm uppercase tracking-wide text-slate-400'>
            Video Playback Test
          </p>
          <h1 className='text-2xl font-semibold text-slate-900'>
            폴더 {folderId}
          </h1>
          {videoMeta && (
            <p className='text-sm text-slate-500'>
              파일명: {videoMeta.name ?? videoMeta.id} · 확장자:{' '}
              {videoMeta.extension ?? '알 수 없음'}
            </p>
          )}
        </header>

        <div
          className='overflow-hidden rounded-xl border border-slate-200 bg-black'
          ref={container}
        >
          {mediaQuery.data.kind === 'video' ? (
            <video
              ref={videoRef}
              src={mediaQuery.data.url}
              controls
              playsInline
              muted
              loop
              className='h-auto w-full'
            />
          ) : (
            <canvas
              ref={lottieCanvasRef}
              width={mediaQuery.data.animation.width}
              height={mediaQuery.data.animation.height}
              className='h-auto w-full bg-white'
            ></canvas>
          )}
        </div>

        <p className='text-sm text-slate-500'>
          {mediaQuery.data.kind === 'video'
            ? '위 영상이 정상 재생되면 업로드한 비디오 파일이 문제 없이 전송·복호화된 것입니다.'
            : '.lottie/.json 애니메이션이 정상 재생되면 업로드한 파일이 문제 없이 전송·복호화된 것입니다.'}
        </p>
      </div>
    </section>
  )
}
