import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TargetImageUpload from './TargetImageUpload'
import ArOptionsSection from './home/ArOptionsSection'
import HeroHeader from './home/HeroHeader'
import InfoFooter from './home/InfoFooter'
import PageBackground from './home/PageBackground'
import PublishSection from './home/PublishSection'
import StepIndicator from './home/StepIndicator'
import UploadCard from './home/UploadCard'
import VideoUploadSection from './home/VideoUploadSection'
import { useImageCompiler } from '../hooks/useImageCompiler'
import { API_URL } from '../config/api'

const STEPS = [
  { label: '타겟 업로드', description: '이미지 파일' },
  { label: '영상 업로드', description: '비디오 파일' },
  { label: '배포', description: 'QR 생성' },
]

const stepMessageMap = {
  1: 'Step 1. 타겟 이미지를 업로드해주세요.',
  2: 'Step 2. 타겟에 재생될 영상을 업로드해주세요',
  3: 'Step 3. 배포 버튼을 클릭하세요.',
}

const MAX_VIDEO_SIZE_MB = 32
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

// 유효한 hex 색상인지 검증
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

export default function App() {
  const [progress, setProgress] = useState<number>(0)
  const navigate = useNavigate()

  // 타겟 이미지 파일 (컴파일 전 원본)
  const [targetImageFiles, setTargetImageFiles] = useState<File[]>([])

  // 비디오 관련 상태
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  // 업로드/에러 상태
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // 옵션 상태
  const [useChromaKey, setUseChromaKey] = useState(false)
  const [chromaKeyColor, setChromaKeyColor] = useState('#00FF00')
  const [chromaKeyError, setChromaKeyError] = useState<string | null>(null)
  const [flatView, setFlatView] = useState(false)
  const [highPrecision, setHighPrecision] = useState(false)

  // 훅
  const { compile, isCompiling, progress: compileProgress } = useImageCompiler()

  const handleTargetImageSelect = useCallback((files: File[]) => {
    setTargetImageFiles(files)
  }, [])

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

  // 퍼블리시 가능 여부
  const canPublish =
    targetImageFiles.length > 0 &&
    videoFile !== null &&
    (!useChromaKey || isValidHexColor(chromaKeyColor))

  const handleChromaKeyColorChange = (color: string) => {
    setChromaKeyColor(color)
    if (color && !isValidHexColor(color)) {
      setChromaKeyError('유효한 HEX 색상을 입력하세요 (예: #00FF00)')
    } else {
      setChromaKeyError(null)
    }
  }

  // 퍼블리시: 컴파일 + 업로드 순차 실행
  const handlePublish = async () => {
    if (!canPublish || isUploading || isCompiling) return

    // 크로마키 색상 validation
    if (useChromaKey && !isValidHexColor(chromaKeyColor)) {
      setChromaKeyError('유효한 HEX 색상을 입력하세요 (예: #00FF00)')
      return
    }

    try {
      setUploadError(null)

      // 1. 타겟 이미지 컴파일
      const { targetBuffer, originalImage } = await compile(targetImageFiles, {
        highPrecision,
      })

      // 2. FormData 구성
      const formData = new FormData()
      const blob = new Blob([targetBuffer], { type: 'application/octet-stream' })
      formData.append('target', blob, 'targets.mind')
      formData.append('video', videoFile)

      // 원본 타겟 이미지 추가 (비율 계산용)
      formData.append('targetImage', originalImage)

      // 크로마키 색상 전송
      if (useChromaKey && chromaKeyColor) {
        formData.append('chromaKeyColor', chromaKeyColor)
      }
      // 정면 고정 옵션 전송
      if (flatView) {
        formData.append('flatView', 'true')
      }
      // 추적 정확도 향상 옵션 전송
      if (highPrecision) {
        formData.append('highPrecision', 'true')
      }

      // 3. 업로드
      const res = await uploadWithProgress(formData)
      navigate(`/result/qr/${res.folderId}`)
    } catch (error) {
      console.error(error)
      setUploadError(
        error instanceof Error
          ? error.message
          : '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      )
    }
  }

  // 업로드 (진행률 표시용: XMLHttpRequest 사용)
  const uploadWithProgress = async (formData: FormData) => {
    setProgress(0)
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

  // 현재 스텝 계산
  const currentStep = useMemo(() => {
    if (targetImageFiles.length === 0) return 1
    if (!videoFile) return 2
    return 3
  }, [targetImageFiles.length, videoFile])

  // 상태 텍스트와 타입
  const { workflowStatus, statusType } = useMemo(() => {
    if (isCompiling) return { workflowStatus: `타겟 변환 중 (${Math.round(compileProgress)}%)`, statusType: 'compiling' as const }
    if (isUploading) return { workflowStatus: `업로드 중 (${progress}%)`, statusType: 'uploading' as const }
    if (uploadError) return { workflowStatus: '오류 발생', statusType: 'error' as const }
    if (canPublish) return { workflowStatus: '배포 준비 완료', statusType: 'ready' as const }
    return { workflowStatus: '파일을 업로드해주세요', statusType: 'idle' as const }
  }, [canPublish, isCompiling, isUploading, uploadError, compileProgress, progress])

  return (
    <PageBackground>
      <div className='container mx-auto px-4 py-12'>
        <div className='mx-auto max-w-2xl space-y-10'>
          <HeroHeader />

          <StepIndicator steps={STEPS} currentStep={currentStep} />

          <UploadCard
            stepMessage={stepMessageMap[currentStep as 1 | 2 | 3]}
            status={workflowStatus}
            statusType={statusType}
          >
            {/* AR 설정 */}
            <div className='mb-6'>
              <ArOptionsSection
                highPrecision={highPrecision}
                onHighPrecisionChange={setHighPrecision}
              />
            </div>

            {/* 타겟 이미지 업로드 */}
            <div className='mb-6'>
              <TargetImageUpload
                files={targetImageFiles}
                onFileSelect={handleTargetImageSelect}
              />
            </div>

            {/* 비디오 업로드 */}
            <VideoUploadSection
              isTargetReady={targetImageFiles.length > 0}
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

            {/* 배포 섹션 */}
            <PublishSection
              canPublish={canPublish}
              onPublish={handlePublish}
              progress={isCompiling ? compileProgress : progress}
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
