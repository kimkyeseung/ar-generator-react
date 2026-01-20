import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TargetImageUpload from '../components/TargetImageUpload'
import ArOptionsSection from '../components/home/ArOptionsSection'
import HeroHeader from '../components/home/HeroHeader'
import InfoFooter from '../components/home/InfoFooter'
import PageBackground from '../components/home/PageBackground'
import PublishSection from '../components/home/PublishSection'
import UploadCard from '../components/home/UploadCard'
import VideoUploadSection from '../components/home/VideoUploadSection'
import PasswordModal from '../components/PasswordModal'
import { Button } from '../components/ui/button'
import { useVideoCompressor } from '../hooks/useVideoCompressor'
import { useImageCompiler } from '../hooks/useImageCompiler'

const API_URL = process.env.REACT_APP_API_URL
const MAX_VIDEO_SIZE_MB = 32
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

// 유효한 hex 색상인지 검증
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

export default function CreateProjectPage() {
  const [progress, setProgress] = useState<number>(0)
  const navigate = useNavigate()

  // 타겟 이미지 파일 (컴파일 전 원본)
  const [targetImageFiles, setTargetImageFiles] = useState<File[]>([])

  // 비디오 관련 상태
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [previewVideoFile, setPreviewVideoFile] = useState<File | null>(null)
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(1)
  const [videoError, setVideoError] = useState<string | null>(null)

  // 업로드/에러 상태
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)

  // 옵션 상태
  const [title, setTitle] = useState<string>('')
  const [useChromaKey, setUseChromaKey] = useState(false)
  const [chromaKeyColor, setChromaKeyColor] = useState('#00FF00')
  const [chromaKeyError, setChromaKeyError] = useState<string | null>(null)
  const [flatView, setFlatView] = useState(false)
  const [highPrecision, setHighPrecision] = useState(false)

  // 비밀번호 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // 훅
  const { compressVideo, compressionProgress } = useVideoCompressor()
  const { compile, isCompiling, progress: compileProgress } = useImageCompiler()

  const handleTargetImageSelect = useCallback((files: File[]) => {
    setTargetImageFiles(files)
  }, [])

  const handleVideoSelect = useCallback(async (input: File | File[] | null) => {
    setVideoError(null)
    setPreviewVideoFile(null)

    const processVideo = async (file: File) => {
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

      // 저화질 프리뷰 영상 생성 (백그라운드에서)
      setIsCompressing(true)
      try {
        const { previewFile } = await compressVideo(file)
        setPreviewVideoFile(previewFile)
        console.log(
          `[Compressor] Preview: ${(previewFile.size / 1024 / 1024).toFixed(2)}MB, Original: ${(file.size / 1024 / 1024).toFixed(2)}MB`
        )
      } catch (err) {
        console.warn('Preview compression failed, will upload without preview:', err)
      } finally {
        setIsCompressing(false)
      }
    }

    if (Array.isArray(input)) {
      if (input.length === 0) {
        setVideoFile(null)
        setVideoAspectRatio(1)
        return
      }
      await processVideo(input[0])
      return
    }

    if (!input) {
      setVideoFile(null)
      setVideoAspectRatio(1)
      return
    }

    await processVideo(input)
  }, [compressVideo])

  // 퍼블리시 가능 여부: 타겟 이미지 파일 + 비디오 파일이 있어야 함
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

  // 배포 버튼 클릭 시 비밀번호 모달 열기
  const handlePublishClick = () => {
    if (!canPublish || isUploading || isCompiling || isCompressing) return

    // 크로마키 색상 validation
    if (useChromaKey && !isValidHexColor(chromaKeyColor)) {
      setChromaKeyError('유효한 HEX 색상을 입력하세요 (예: #00FF00)')
      return
    }

    setPasswordError(null)
    setShowPasswordModal(true)
  }

  // 비밀번호 검증 API 호출
  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/verify-password`, {
        method: 'POST',
        headers: {
          'X-Admin-Password': password,
        },
      })
      return res.ok
    } catch {
      return false
    }
  }

  // 비밀번호 확인 후 컴파일 + 업로드 순차 실행
  const handlePasswordSubmit = async (password: string) => {
    if (!canPublish || targetImageFiles.length === 0 || !videoFile) return

    try {
      setUploadError(null)

      // 1. 비밀번호 먼저 검증
      const isValidPassword = await verifyPassword(password)
      if (!isValidPassword) {
        setPasswordError('비밀번호가 올바르지 않습니다.')
        return
      }

      // 2. 타겟 이미지 컴파일
      const { targetBuffer, originalImage } = await compile(targetImageFiles, {
        highPrecision,
      })

      // 3. FormData 구성
      const formData = new FormData()
      const blob = new Blob([targetBuffer], { type: 'application/octet-stream' })
      formData.append('target', blob, 'targets.mind')
      formData.append('video', videoFile)

      // 저화질 프리뷰 영상 추가 (있는 경우)
      if (previewVideoFile) {
        formData.append('previewVideo', previewVideoFile)
      }
      // 원본 타겟 이미지 추가 (썸네일용)
      formData.append('targetImage', originalImage)

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
      // 추적 정확도 향상 옵션 전송
      if (highPrecision) {
        formData.append('highPrecision', 'true')
      }

      // 4. 업로드
      const res = await uploadWithProgress(formData, password)
      setShowPasswordModal(false)
      navigate(`/result/qr/${res.folderId}`)
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

      // 비밀번호 오류인 경우 모달에 표시
      if (errorMessage.includes('401') || errorMessage.includes('비밀번호')) {
        setPasswordError('비밀번호가 올바르지 않습니다.')
      } else {
        setShowPasswordModal(false)
        setUploadError(errorMessage)
      }
    }
  }

  // 업로드 (진행률 표시용: XMLHttpRequest 사용)
  const uploadWithProgress = async (formData: FormData, password: string) => {
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
        xhr.setRequestHeader('X-Admin-Password', password)
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
          } else if (xhr.status === 401) {
            reject(new Error('401: 비밀번호가 올바르지 않습니다.'))
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

  // 현재 단계 메시지
  const stepMessage = useMemo(() => {
    if (targetImageFiles.length === 0) {
      return 'Step 1. 타겟 이미지를 업로드해주세요.'
    }
    if (!videoFile) {
      return 'Step 2. 타겟에 재생될 영상을 업로드해주세요.'
    }
    return 'Step 3. 배포 버튼을 클릭하세요.'
  }, [targetImageFiles.length, videoFile])

  // 워크플로우 상태
  const workflowStatus = useMemo(() => {
    if (isCompiling) return `타겟 변환 중 (${Math.round(compileProgress)}%)`
    if (isCompressing) return compressionProgress?.message || '영상 압축 중'
    if (isUploading) return `업로드 중 (${progress}%)`
    if (canPublish) return '배포 준비 완료'
    return '파일을 업로드해주세요'
  }, [canPublish, isCompiling, isCompressing, isUploading, compileProgress, compressionProgress, progress])

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
            stepMessage={stepMessage}
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
              onPublish={handlePublishClick}
              progress={isCompiling ? compileProgress : progress}
              isUploading={isUploading}
              isCompiling={isCompiling}
              isCompressing={isCompressing}
              compressionProgress={compressionProgress?.progress ?? 0}
              uploadError={uploadError}
            />
          </UploadCard>

          <InfoFooter />
        </div>
      </div>

      {/* 비밀번호 입력 모달 */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setPasswordError(null)
        }}
        onSubmit={handlePasswordSubmit}
        isLoading={isUploading || isCompiling}
        error={passwordError}
      />
    </PageBackground>
  )
}
