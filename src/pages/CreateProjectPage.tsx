import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MindARCompiler from '../components/MindARCompiler'
import HeroHeader from '../components/home/HeroHeader'
import InfoFooter from '../components/home/InfoFooter'
import PageBackground from '../components/home/PageBackground'
import PublishSection from '../components/home/PublishSection'
import UploadCard from '../components/home/UploadCard'
import VideoUploadSection from '../components/home/VideoUploadSection'
import { Button } from '../components/ui/button'

const stepMessageMap = {
  1: 'Step 1. 타겟 이미지를 업로드해주세요.',
  2: 'Step 2. 타겟에 재생될 영상을 업로드해주세요',
}

const API_URL = process.env.REACT_APP_API_URL
const MAX_VIDEO_SIZE_MB = 32
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

export default function CreateProjectPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [progress, setProgress] = useState<number>(0)
  const navigate = useNavigate()
  const [targetFile, setTargetFile] = useState<ArrayBuffer | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [mediaWidth, setMediaWidth] = useState<number>(1)
  const [mediaHeight, setMediaHeight] = useState<number>(1)
  const [title, setTitle] = useState<string>('')

  const handleVideoSelect = useCallback((input: File | File[] | null) => {
    setVideoError(null)

    const processVideo = (file: File) => {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        setVideoError(
          `비디오 파일은 최대 ${MAX_VIDEO_SIZE_MB}MB까지만 업로드할 수 있습니다.`
        )
        setVideoFile(null)
        return
      }

      // 비디오 메타데이터에서 width, height 추출
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        setMediaWidth(video.videoWidth)
        setMediaHeight(video.videoHeight)
        URL.revokeObjectURL(video.src)
      }
      video.src = URL.createObjectURL(file)

      setVideoFile(file)
    }

    if (Array.isArray(input)) {
      if (input.length === 0) {
        setVideoFile(null)
        return
      }
      processVideo(input[0])
      return
    }

    if (!input) {
      setVideoFile(null)
      return
    }

    processVideo(input)
  }, [])

  const canPublish = targetFile !== null && videoFile !== null

  const handlePublish = async () => {
    if (!canPublish || isUploading || isCompiling) return
    const formData = new FormData()
    const blob = new Blob([targetFile], { type: 'application/octet-stream' })
    formData.append('target', blob, 'targets.mind')
    formData.append('video', videoFile)
    formData.append('width', mediaWidth.toString())
    formData.append('height', mediaHeight.toString())
    if (title) {
      formData.append('title', title)
    }

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
          <div className='flex items-center justify-between'>
            <Button
              variant='ghost'
              onClick={() => navigate('/')}
              className='text-white/70 hover:text-white hover:bg-white/10'
            >
              ← 목록으로
            </Button>
          </div>

          <HeroHeader />

          <UploadCard
            stepMessage={stepMessageMap[step]}
            status={workflowStatus}
          >
            {/* 프로젝트 제목 입력 */}
            <div className='mb-6'>
              <label className='block text-sm font-medium text-white/70 mb-2'>
                프로젝트 제목 (선택)
              </label>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='프로젝트 제목을 입력하세요'
                className='w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500'
              />
            </div>

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
              mediaWidth={mediaWidth}
              mediaHeight={mediaHeight}
              onWidthChange={setMediaWidth}
              onHeightChange={setMediaHeight}
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
