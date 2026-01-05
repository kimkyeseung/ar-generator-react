import { useState, useCallback, useRef } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'

interface CompressionResult {
  previewFile: File
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
    async (videoFile: File): Promise<CompressionResult> => {
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

        // 저화질 압축 (빠른 로딩용)
        // -vf scale=480:-2: 가로 480px, 세로는 비율 유지 (짝수)
        // -c:v libx264: H.264 코덱
        // -crf 35: 낮은 품질 (높을수록 품질 낮음, 23이 기본)
        // -preset ultrafast: 가장 빠른 인코딩
        // -c:a aac -b:a 64k: 오디오 64kbps
        await ffmpeg.exec([
          '-i', inputName,
          '-vf', 'scale=480:-2',
          '-c:v', 'libx264',
          '-crf', '35',
          '-preset', 'ultrafast',
          '-c:a', 'aac',
          '-b:a', '64k',
          '-movflags', '+faststart', // 웹 스트리밍 최적화
          outputName,
        ])

        // 결과 파일 읽기
        const data = await ffmpeg.readFile(outputName)
        const previewBlob = new Blob([data], { type: 'video/mp4' })
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
