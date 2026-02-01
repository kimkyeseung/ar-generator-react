import { useState, useCallback, useRef } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { VideoQuality } from '../types/project'

interface CompressionResult {
  previewFile: File | null // null when quality is 'high' (no compression)
  originalFile: File
}

interface CompressionProgress {
  stage: 'loading' | 'compressing' | 'done' | 'error'
  progress: number // 0-100
  message: string
}

// URL을 fetch하여 Blob URL로 변환 (CORS 우회)
async function fetchToBlobURL(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  return URL.createObjectURL(new Blob([blob], { type: mimeType }))
}

export function useVideoCompressor() {
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const loadedRef = useRef(false)

  const loadFFmpeg = useCallback(async () => {
    if (loadedRef.current && ffmpegRef.current) {
      return ffmpegRef.current
    }

    setCompressionProgress({
      stage: 'loading',
      progress: 0,
      message: 'FFmpeg 로딩 중...',
    })

    const ffmpeg = new FFmpeg()
    ffmpegRef.current = ffmpeg

    // 진행률 콜백
    ffmpeg.on('progress', ({ progress }) => {
      setCompressionProgress({
        stage: 'compressing',
        progress: Math.round(progress * 100),
        message: `압축 중... ${Math.round(progress * 100)}%`,
      })
    })

    // CDN에서 ffmpeg core 로드 (UMD 버전 사용 - ESM 모듈 문제 회피)
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    await ffmpeg.load({
      coreURL: await fetchToBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await fetchToBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    loadedRef.current = true
    return ffmpeg
  }, [])

  const compressVideo = useCallback(
    async (videoFile: File, quality: VideoQuality = 'low'): Promise<CompressionResult> => {
      // 고화질(압축x)인 경우 압축하지 않음
      if (quality === 'high') {
        setCompressionProgress({
          stage: 'done',
          progress: 100,
          message: '고화질 모드 (압축 없음)',
        })
        return {
          previewFile: null,
          originalFile: videoFile,
        }
      }

      try {
        const ffmpeg = await loadFFmpeg()

        setCompressionProgress({
          stage: 'compressing',
          progress: 0,
          message: '영상 압축 준비 중...',
        })

        // 입력 파일 쓰기
        const inputName = 'input.mp4'
        const outputName = 'preview.mp4'
        const arrayBuffer = await videoFile.arrayBuffer()
        await ffmpeg.writeFile(inputName, new Uint8Array(arrayBuffer))

        // 품질별 압축 설정
        // medium: 720p, CRF 28, 128kbps 오디오
        // low: 480p, CRF 35, 64kbps 오디오
        const qualitySettings = {
          medium: {
            scale: 'scale=1280:-2', // 720p
            crf: '28',
            audioBitrate: '128k',
          },
          low: {
            scale: 'scale=480:-2', // 480p
            crf: '35',
            audioBitrate: '64k',
          },
        }

        const settings = qualitySettings[quality]

        await ffmpeg.exec([
          '-i', inputName,
          '-vf', settings.scale,
          '-c:v', 'libx264',
          '-crf', settings.crf,
          '-preset', 'ultrafast',
          '-c:a', 'aac',
          '-b:a', settings.audioBitrate,
          '-movflags', '+faststart', // 웹 스트리밍 최적화
          outputName,
        ])

        // 결과 파일 읽기
        const data = await ffmpeg.readFile(outputName)
        const previewBlob = new Blob([data as BlobPart], { type: 'video/mp4' })
        const previewFile = new File([previewBlob], 'preview.mp4', {
          type: 'video/mp4',
        })

        // 정리
        await ffmpeg.deleteFile(inputName)
        await ffmpeg.deleteFile(outputName)

        setCompressionProgress({
          stage: 'done',
          progress: 100,
          message: '압축 완료!',
        })

        return {
          previewFile,
          originalFile: videoFile,
        }
      } catch (error) {
        console.error('Video compression failed:', error)
        setCompressionProgress({
          stage: 'error',
          progress: 0,
          message: '압축 실패. 원본만 사용합니다.',
        })
        throw error
      }
    },
    [loadFFmpeg]
  )

  const resetProgress = useCallback(() => {
    setCompressionProgress(null)
  }, [])

  return {
    compressVideo,
    compressionProgress,
    resetProgress,
  }
}
