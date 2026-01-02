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

// 유효한 hex 색상인지 검증
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

export default function CreateProjectPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [progress, setProgress] = useState<number>(0)
  const navigate = useNavigate()
  const [targetFile, setTargetFile] = useState<ArrayBuffer | null>(null)
  const [targetImageFile, setTargetImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(1)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [title, setTitle] = useState<string>('')
  const [useChromaKey, setUseChromaKey] = useState(false)
  const [chromaKeyColor, setChromaKeyColor] = useState('#00FF00')
  const [chromaKeyError, setChromaKeyError] = useState<string | null>(null)
  const [flatView, setFlatView] = useState(false)

  const handleVideoSelect = useCallback((input: File | File[] | null) => {
    setVideoError(null)

    const processVideo = (file: File) => {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        setVideoError(
          `비디오 파일은 최대 ${MAX_VIDEO_SIZE_MB}MB까지만 업로드할 수 있습니다.`
        )
        setVideoFile(null)
        setVideoAspectRatio(1)
        return
      }

      // 비디오의 실제 비율 계산
      const videoElement = document.createElement('video')
      videoElement.preload = 'metadata'
      videoElement.onloadedmetadata = () => {
        const ratio = videoElement.videoHeight / videoElement.videoWidth
        setVideoAspectRatio(ratio)
        URL.revokeObjectURL(videoElement.src)
      }
      videoElement.src = URL.createObjectURL(file)

      setVideoFile(file)
    }

    if (Array.isArray(input)) {
      if (input.length === 0) {
        setVideoFile(null)
        setVideoAspectRatio(1)
        return
      }
      processVideo(input[0])
      return
    }

    if (!input) {
      setVideoFile(null)
      setVideoAspectRatio(1)
      return
    }

    processVideo(input)
  }, [])

  const canPublish = targetFile !== null && videoFile !== null && (!useChromaKey || isValidHexColor(chromaKeyColor))

  const handleChromaKeyColorChange = (color: string) => {
    setChromaKeyColor(color)
    if (color && !isValidHexColor(color)) {
      setChromaKeyError('유효한 HEX 색상을 입력하세요 (예: #00FF00)')
    } else {
      setChromaKeyError(null)
    }
  }

  const handlePublish = async () => {
    if (!canPublish || isUploading || isCompiling) return

    // 크로마키 색상 validation
    if (useChromaKey && !isValidHexColor(chromaKeyColor)) {
      setChromaKeyError('유효한 HEX 색상을 입력하세요 (예: #00FF00)')
      return
    }

    const formData = new FormData()
    const blob = new Blob([targetFile], { type: 'application/octet-stream' })
    formData.append('target', blob, 'targets.mind')
    formData.append('video', videoFile)
    // 원본 타겟 이미지 추가 (썸네일용)
    if (targetImageFile) {
      formData.append('targetImage', targetImageFile)
    }
    // 비디오 비율 전송 (width=1 고정, height=종횡비)
    formData.append('width', '1')
    formData.append('height', videoAspectRatio.toString())
    if (title) {
      formData.append('title', title)
    }
    // 크로마키 색상 전송
    if (useChromaKey && chromaKeyColor) {
      formData.append('chromaKeyColor', chromaKeyColor)
    }
    // 정면 고정 옵션 전송
    if (flatView) {
      formData.append('flatView', 'true')
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

  const handleComplieComplete = (target: ArrayBuffer, originalImage: File) => {
    setTargetFile(target)
    setTargetImageFile(originalImage)
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
              className='text-gray-600 hover:text-gray-800 hover:bg-gray-100'
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
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                프로젝트 제목 (선택)
              </label>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='프로젝트 제목을 입력하세요'
                className='w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
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
              useChromaKey={useChromaKey}
              onUseChromaKeyChange={setUseChromaKey}
              chromaKeyColor={chromaKeyColor}
              onChromaKeyColorChange={handleChromaKeyColorChange}
              chromaKeyError={chromaKeyError}
              flatView={flatView}
              onFlatViewChange={setFlatView}
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
