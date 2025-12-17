import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MindARCompiler from '../components/MindARCompiler'
import HeroHeader from '../components/home/HeroHeader'
import PageBackground from '../components/home/PageBackground'
import UploadCard from '../components/home/UploadCard'
import VideoUploadSection from '../components/home/VideoUploadSection'
import { Button } from '../components/ui/button'
import { Project } from '../types/project'

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
  const [targetFile, setTargetFile] = useState<ArrayBuffer | null>(null)
  const [targetImageFile, setTargetImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null) // null이면 기존 비율 유지
  const [videoError, setVideoError] = useState<string | null>(null)
  const [useChromaKey, setUseChromaKey] = useState(false)
  const [chromaKeyColor, setChromaKeyColor] = useState('#00FF00')
  const [chromaKeyError, setChromaKeyError] = useState<string | null>(null)

  // Upload state
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
        // 비디오 비율은 기존 프로젝트의 height를 사용 (videoAspectRatio가 null이면)
        if (data.chromaKeyColor) {
          setUseChromaKey(true)
          setChromaKeyColor(data.chromaKeyColor)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [id])

  const handleVideoSelect = useCallback((input: File | File[] | null) => {
    setVideoError(null)

    const processVideo = (file: File) => {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        setVideoError(
          `비디오 파일은 최대 ${MAX_VIDEO_SIZE_MB}MB까지만 업로드할 수 있습니다.`
        )
        setVideoFile(null)
        setVideoAspectRatio(null)
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
        setVideoAspectRatio(null)
        return
      }
      processVideo(input[0])
      return
    }

    if (!input) {
      setVideoFile(null)
      setVideoAspectRatio(null)
      return
    }

    processVideo(input)
  }, [])

  const handleChromaKeyColorChange = (color: string) => {
    setChromaKeyColor(color)
    if (color && !isValidHexColor(color)) {
      setChromaKeyError('유효한 HEX 색상을 입력하세요 (예: #00FF00)')
    } else {
      setChromaKeyError(null)
    }
  }

  const handleComplieComplete = (target: ArrayBuffer, originalImage: File) => {
    setTargetFile(target)
    setTargetImageFile(originalImage)
    // 비디오 비율을 사용하므로 타겟 이미지 비율은 무시
  }

  const canSave =
    !isUploading &&
    !isCompiling &&
    (!useChromaKey || isValidHexColor(chromaKeyColor))

  const handleSave = async () => {
    if (!canSave || !id) return

    if (useChromaKey && !isValidHexColor(chromaKeyColor)) {
      setChromaKeyError('유효한 HEX 색상을 입력하세요 (예: #00FF00)')
      return
    }

    const formData = new FormData()

    // 메타데이터
    formData.append('title', title)
    formData.append('width', '1')
    // 새 비디오가 선택되면 새 비율 사용, 아니면 기존 비율 유지
    const heightValue = videoAspectRatio ?? project?.height ?? 1
    formData.append('height', heightValue.toString())
    formData.append('chromaKeyColor', useChromaKey ? chromaKeyColor : '')

    // 파일 (변경된 경우에만)
    if (targetFile) {
      const blob = new Blob([targetFile], { type: 'application/octet-stream' })
      formData.append('target', blob, 'targets.mind')
    }
    if (targetImageFile) {
      formData.append('targetImage', targetImageFile)
    }
    if (videoFile) {
      formData.append('video', videoFile)
    }

    try {
      setProgress(0)
      setUploadError(null)
      setIsUploading(true)

      const res = await new Promise<Project>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API_URL}/projects/${id}/update`)
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
            reject(new Error(`업데이트 실패: ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formData)
      })

      navigate(`/result/qr/${res.folderId}`)
    } catch (err) {
      console.error(err)
      setUploadError(
        err instanceof Error
          ? err.message
          : '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      )
    } finally {
      setIsUploading(false)
    }
  }

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
            status={isUploading ? '저장 중...' : '편집 모드'}
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

            {/* 현재 타겟 이미지 표시 */}
            {project.targetImageFileId && !targetImageFile && (
              <div className='mb-6'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  현재 타겟 이미지
                </label>
                <img
                  src={`${API_URL}/file/${project.targetImageFileId}`}
                  alt='현재 타겟 이미지'
                  className='w-32 h-32 object-cover rounded-lg border border-gray-200'
                />
              </div>
            )}

            {/* 타겟 이미지 변경 */}
            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                타겟 이미지 변경 (선택)
              </label>
              <MindARCompiler
                onCompileColplete={handleComplieComplete}
                onCompileStateChange={setIsCompiling}
              />
            </div>

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
              />
            </div>

            {/* 저장 버튼 */}
            <div className='mt-8'>
              {uploadError && (
                <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm'>
                  {uploadError}
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
                  className='flex-1'
                  disabled={isUploading}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!canSave}
                  className='flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                >
                  {isUploading ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          </UploadCard>
        </div>
      </div>
    </PageBackground>
  )
}
