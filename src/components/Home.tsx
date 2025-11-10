import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MindARCompiler from './MindARCompiler'
import HeroHeader from './home/HeroHeader'
import InfoFooter from './home/InfoFooter'
import PageBackground from './home/PageBackground'
import PublishSection from './home/PublishSection'
import UploadCard from './home/UploadCard'
import VideoUploadSection from './home/VideoUploadSection'

const stepMessageMap = {
  1: 'Step 1. 타겟 이미지를 업로드해주세요.',
  2: 'Step 2. 타겟에 재생될 영상을 업로드해주세요',
}

const API_URL = process.env.REACT_APP_API_URL
const MAX_VIDEO_SIZE_MB = 32
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

export default function App() {
  const [step, setStep] = useState<1 | 2>(1)
  const [progress, setProgress] = useState<number>(0)
  const navigate = useNavigate()
  const [targetFile, setTargetFile] = useState<ArrayBuffer | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)

  const handleVideoSelect = useCallback((input: File | File[] | null) => {
    setVideoError(null)

    if (Array.isArray(input)) {
      if (input.length === 0) {
        setVideoFile(null)
        return
      }
      const candidate = input[0]
      if (candidate.size > MAX_VIDEO_SIZE_BYTES) {
        setVideoError(
          `비디오 파일은 최대 ${MAX_VIDEO_SIZE_MB}MB까지만 업로드할 수 있습니다.`
        )
        setVideoFile(null)
        return
      }
      setVideoFile(candidate)
      return
    }

    if (!input) {
      setVideoFile(null)
      return
    }

    if (input.size > MAX_VIDEO_SIZE_BYTES) {
      setVideoError(
        `비디오 파일은 최대 ${MAX_VIDEO_SIZE_MB}MB까지만 업로드할 수 있습니다.`
      )
      setVideoFile(null)
      return
    }

    setVideoFile(input)
  }, [])

  const canPublish = targetFile !== null && videoFile !== null

  const handlePublish = async () => {
    if (!canPublish || isUploading || isCompiling) return
    const formData = new FormData()
    const blob = new Blob([targetFile], { type: 'application/octet-stream' })
    formData.append('target', blob, 'targets.mind')
    formData.append('video', videoFile)

    try {
      const res = await uploadWithProgress(formData)
      navigate(`/result/qr/${res.folderId}`)
    } catch (error) {
      console.error(error)
      setUploadError(
        error instanceof Error
          ? error.message
          : '업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      )
    }
  }

  // 업로드 (진행률 표시용: XMLHttpRequest 사용)
  const uploadWithProgress = async (formData: FormData) => {
    setProgress(0)
    setUploadError(null)
    setIsUploading(true)
    try {
      return await new Promise<{
        folderId: string
        targetFileId: string
        videoFileId: string
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.open('POST', `${API_URL}/upload`)
        xhr.responseType = 'json'

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100)
            setProgress(pct)
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100)
            resolve(xhr.response)
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formData)
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleComplieComplete = (target: ArrayBuffer) => {
    setTargetFile(target)
    setStep(2)
  }

  const workflowStatus = useMemo(() => {
    if (isCompiling) return '타겟 변환 중'
    if (isUploading) return '업로드 중'
    if (canPublish) return '배포 준비 완료'
    return '업로드를 진행해주세요'
  }, [canPublish, isCompiling, isUploading])

  return (
    <PageBackground>
      <div className='container mx-auto px-4 py-12'>
        <div className='mx-auto max-w-2xl space-y-10'>
          <HeroHeader />

          <UploadCard
            stepMessage={stepMessageMap[step]}
            status={workflowStatus}
          >
            <MindARCompiler
              onCompileColplete={handleComplieComplete}
              onCompileStateChange={setIsCompiling}
            />

            <VideoUploadSection
              isTargetReady={Boolean(targetFile)}
              videoFile={videoFile}
              onFileSelect={handleVideoSelect}
              limitMb={MAX_VIDEO_SIZE_MB}
              videoError={videoError}
            />

            <PublishSection
              canPublish={canPublish}
              onPublish={handlePublish}
              progress={progress}
              isUploading={isUploading}
              isCompiling={isCompiling}
              uploadError={uploadError}
            />
          </UploadCard>

          <InfoFooter />
        </div>
      </div>
    </PageBackground>
  )
}
