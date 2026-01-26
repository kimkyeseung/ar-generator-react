import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TargetImageUpload from '../components/TargetImageUpload'
import VideoPositionEditor from '../components/VideoPositionEditor'
import ArOptionsSection from '../components/home/ArOptionsSection'
import HeroHeader from '../components/home/HeroHeader'
import PageBackground from '../components/home/PageBackground'
import UploadCard from '../components/home/UploadCard'
import VideoUploadSection from '../components/home/VideoUploadSection'
import PasswordModal from '../components/PasswordModal'
import { Button } from '../components/ui/button'
import { Project, ProjectMode, VideoPosition } from '../types/project'
import { useVideoCompressor } from '../hooks/useVideoCompressor'
import { useImageCompiler } from '../hooks/useImageCompiler'
import { Progress } from '../components/ui/progress'

const API_URL = process.env.REACT_APP_API_URL
const MAX_VIDEO_SIZE_MB = 32
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<ProjectMode>('ar')
  const [targetImageFiles, setTargetImageFiles] = useState<File[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [previewVideoFile, setPreviewVideoFile] = useState<File | null>(null)
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [useChromaKey, setUseChromaKey] = useState(false)
  const [chromaKeyColor, setChromaKeyColor] = useState('#00FF00')
  const [chromaKeyError, setChromaKeyError] = useState<string | null>(null)
  const [flatView, setFlatView] = useState(false)
  const [highPrecision, setHighPrecision] = useState(false)
  const [videoPosition, setVideoPosition] = useState<VideoPosition>({ x: 0.5, y: 0.5 })
  const [videoScale, setVideoScale] = useState(1)

  // Upload state
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // 비밀번호 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // 훅
  const { compressVideo, compressionProgress } = useVideoCompressor()
  const { compile, isCompiling, progress: compileProgress } = useImageCompiler()

  // 프로젝트 로드
  useEffect(() => {
    if (!id) return

    const fetchProject = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`${API_URL}/projects/${id}`)
        if (!res.ok) throw new Error('프로젝트를 불러오지 못했습니다.')
        const data: Project = await res.json()
        setProject(data)
        setTitle(data.title || '')
        setMode(data.mode || 'ar')
        if (data.chromaKeyColor) {
          setUseChromaKey(true)
          setChromaKeyColor(data.chromaKeyColor)
        }
        if (data.flatView) {
          setFlatView(data.flatView)
        }
        if (data.highPrecision) {
          setHighPrecision(data.highPrecision)
        }
        // 기본모드 위치/크기 로드
        if (data.videoPosition) {
          setVideoPosition(data.videoPosition)
        }
        if (data.videoScale != null) {
          setVideoScale(data.videoScale)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [id])

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
        setVideoAspectRatio(null)
        return
      }

      const videoElement = document.createElement('video')
      videoElement.preload = 'metadata'
      videoElement.onloadedmetadata = () => {
        const ratio = videoElement.videoHeight / videoElement.videoWidth
        setVideoAspectRatio(ratio)
        URL.revokeObjectURL(videoElement.src)
      }
      videoElement.src = URL.createObjectURL(file)

      setVideoFile(file)

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
        setVideoAspectRatio(null)
        return
      }
      await processVideo(input[0])
      return
    }

    if (!input) {
      setVideoFile(null)
      setVideoAspectRatio(null)
      return
    }

    await processVideo(input)
  }, [compressVideo])

  const handleChromaKeyColorChange = (color: string) => {
    setChromaKeyColor(color)
    if (color && !isValidHexColor(color)) {
      setChromaKeyError('유효한 HEX 색상을 입력하세요 (예: #00FF00)')
    } else {
      setChromaKeyError(null)
    }
  }

  const canSave =
    !isUploading &&
    !isCompiling &&
    !isCompressing &&
    (!useChromaKey || isValidHexColor(chromaKeyColor))

  // 저장 버튼 클릭 시 비밀번호 모달 열기
  const handleSaveClick = () => {
    if (!canSave || !id) return

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

  // 비밀번호 확인 후 (필요시 컴파일 +) 업로드
  const handlePasswordSubmit = async (password: string) => {
    if (!canSave || !id) return

    try {
      setUploadError(null)

      // 1. 비밀번호 먼저 검증
      const isValidPassword = await verifyPassword(password)
      if (!isValidPassword) {
        setPasswordError('비밀번호가 올바르지 않습니다.')
        return
      }

      // 비밀번호 확인 성공 - 모달 닫기
      setShowPasswordModal(false)

      const formData = new FormData()

      // 메타데이터
      formData.append('title', title)
      formData.append('width', '1')
      const heightValue = videoAspectRatio ?? project?.height ?? 1
      formData.append('height', heightValue.toString())
      formData.append('chromaKeyColor', useChromaKey ? chromaKeyColor : '')
      formData.append('flatView', flatView ? 'true' : 'false')
      formData.append('highPrecision', highPrecision ? 'true' : 'false')

      // 기본모드 위치/크기
      if (mode === 'basic') {
        formData.append('videoPositionX', videoPosition.x.toString())
        formData.append('videoPositionY', videoPosition.y.toString())
        formData.append('videoScale', videoScale.toString())
      }

      // 새 타겟 이미지가 있으면 컴파일 후 추가
      if (targetImageFiles.length > 0) {
        const { targetBuffer, originalImage } = await compile(targetImageFiles, {
          highPrecision,
        })
        const blob = new Blob([targetBuffer], { type: 'application/octet-stream' })
        formData.append('target', blob, 'targets.mind')
        formData.append('targetImage', originalImage)
      }

      // 새 비디오가 있으면 추가
      if (videoFile) {
        formData.append('video', videoFile)
        if (previewVideoFile) {
          formData.append('previewVideo', previewVideoFile)
        }
      }

      // 업로드
      setProgress(0)
      setIsUploading(true)

      const res = await new Promise<Project>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API_URL}/projects/${id}/update`)
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
            reject(new Error(`업데이트 실패: ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formData)
      })

      navigate(`/result/qr/${res.folderId}`)
    } catch (err) {
      console.error(err)
      const errorMessage =
        err instanceof Error
          ? err.message
          : '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

      setUploadError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  // 워크플로우 상태
  const workflowStatus = useMemo(() => {
    if (isCompiling) return `타겟 변환 중 (${Math.round(compileProgress)}%)`
    if (isCompressing) return compressionProgress?.message || '영상 압축 중'
    if (isUploading) return `저장 중 (${progress}%)`
    return '편집 모드'
  }, [isCompiling, isCompressing, isUploading, compileProgress, compressionProgress, progress])

  if (isLoading) {
    return (
      <PageBackground>
        <div className='container mx-auto px-4 py-12'>
          <div className='flex justify-center items-center min-h-[50vh]'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600'></div>
          </div>
        </div>
      </PageBackground>
    )
  }

  if (error || !project) {
    return (
      <PageBackground>
        <div className='container mx-auto px-4 py-12'>
          <div className='text-center text-red-600'>
            {error || '프로젝트를 찾을 수 없습니다.'}
          </div>
          <div className='text-center mt-4'>
            <Button onClick={() => navigate('/')}>목록으로</Button>
          </div>
        </div>
      </PageBackground>
    )
  }

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
            stepMessage='프로젝트 편집'
            status={workflowStatus}
          >
            {/* 프로젝트 제목 */}
            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                프로젝트 제목
              </label>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='프로젝트 제목을 입력하세요'
                className='w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              />
            </div>

            {/* 모드 표시 (읽기 전용) */}
            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                프로젝트 모드
              </label>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                mode === 'basic'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {mode === 'basic' ? '📹 기본 모드' : '🎯 AR 모드'}
              </div>
              <p className='text-xs text-gray-500 mt-1'>
                모드는 프로젝트 생성 시에만 선택할 수 있습니다.
              </p>
            </div>

            {/* 현재 에셋 미리보기 */}
            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                현재 에셋
              </label>
              <div className='flex gap-4 flex-wrap'>
                {/* AR 모드에서만 타겟 이미지 표시 */}
                {mode === 'ar' && project.targetImageFileId && targetImageFiles.length === 0 && (
                  <div className='flex flex-col items-center'>
                    <img
                      src={`${API_URL}/file/${project.targetImageFileId}`}
                      alt='현재 타겟 이미지'
                      className='w-32 h-32 object-cover rounded-lg border border-gray-200'
                    />
                    <span className='text-xs text-gray-500 mt-1'>타겟 이미지</span>
                  </div>
                )}
                {project.videoFileId && !videoFile && (
                  <div className='flex flex-col items-center'>
                    <video
                      src={`${API_URL}/file/${project.videoFileId}`}
                      className='w-32 h-32 object-cover rounded-lg border border-gray-200'
                      controls
                      playsInline
                      webkit-playsinline='true'
                      preload='metadata'
                    />
                    <span className='text-xs text-gray-500 mt-1'>현재 비디오</span>
                  </div>
                )}
              </div>
            </div>

            {/* AR 설정 (AR 모드에서만) */}
            {mode === 'ar' && (
              <div className='mb-6'>
                <ArOptionsSection
                  highPrecision={highPrecision}
                  onHighPrecisionChange={setHighPrecision}
                />
              </div>
            )}

            {/* 타겟 이미지 변경 (AR 모드에서만) */}
            {mode === 'ar' && (
              <div className='mb-6'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  타겟 이미지 변경 (선택)
                </label>
                <TargetImageUpload
                  files={targetImageFiles}
                  onFileSelect={handleTargetImageSelect}
                />
              </div>
            )}

            {/* 비디오 변경 */}
            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                비디오 변경 (선택)
              </label>
              <VideoUploadSection
                isTargetReady={true}
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
                showFlatView={mode === 'ar'}
              />
            </div>

            {/* 비디오 위치/크기 조정 (기본 모드에서만) */}
            {mode === 'basic' && videoFile && (
              <div className='mb-6'>
                <VideoPositionEditor
                  videoFile={videoFile}
                  position={videoPosition}
                  scale={videoScale}
                  onPositionChange={setVideoPosition}
                  onScaleChange={setVideoScale}
                  chromaKeyColor={useChromaKey ? chromaKeyColor : undefined}
                />
              </div>
            )}

            {/* 저장 버튼 */}
            <div className='mt-8'>
              {uploadError && (
                <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm'>
                  {uploadError}
                </div>
              )}

              {isCompiling && (
                <div className='mb-4 space-y-2'>
                  <p className='text-sm text-purple-600'>
                    타겟 이미지를 컴파일하고 있습니다...
                  </p>
                  <Progress value={compileProgress} />
                </div>
              )}

              {isCompressing && (
                <div className='mb-4 space-y-2'>
                  <p className='text-sm text-amber-600'>
                    빠른 로딩을 위해 영상을 압축하고 있습니다...
                  </p>
                  <div className='flex items-center justify-between text-xs text-gray-500'>
                    <span>압축 진행률</span>
                    <span>{compressionProgress?.progress ?? 0}%</span>
                  </div>
                  <Progress value={compressionProgress?.progress ?? 0} />
                </div>
              )}

              {isUploading && (
                <div className='mb-4'>
                  <div className='h-2 bg-gray-200 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300'
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className='text-sm text-gray-500 mt-2 text-center'>
                    {progress}% 업로드 중...
                  </p>
                </div>
              )}

              <div className='flex gap-4'>
                <Button
                  variant='outline'
                  onClick={() => navigate('/')}
                  className='flex-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  disabled={isUploading || isCompiling}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSaveClick}
                  disabled={!canSave}
                  className='flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                >
                  {isCompiling ? '컴파일 중...' : isUploading ? '저장 중...' : isCompressing ? '압축 완료 후 저장' : '저장'}
                </Button>
              </div>
            </div>
          </UploadCard>
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
