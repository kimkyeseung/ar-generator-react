import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import HeroHeader from '../components/home/HeroHeader'
import PageBackground from '../components/home/PageBackground'
import PasswordModal from '../components/PasswordModal'
import ProjectForm, { ProjectFormState, ProjectFormExistingData } from '../components/ProjectForm'
import UnifiedPreviewCanvas from '../components/preview/UnifiedPreviewCanvas'
import TwoColumnLayout from '../components/layout/TwoColumnLayout'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import {
  DEFAULT_CHROMAKEY_SETTINGS,
  Project,
  MediaItem,
} from '../types/project'
import { useImageCompiler } from '../hooks/useImageCompiler'
import { API_URL } from '../config/api'
import { verifyPassword } from '../utils/auth'

// 애셋 체크 결과 타입
interface AssetCheckResult {
  name: string
  url: string
  status: 'pending' | 'loading' | 'success' | 'error'
  error?: string
}

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formState, setFormState] = useState<ProjectFormState>({
    title: '',
    cameraResolution: 'fhd',
    videoQuality: 'low',
    thumbnailFile: null,
    targetImageFiles: [],
    guideImageFile: null,
    mediaItems: [],
    selectedMediaItemId: null,
    highPrecision: false,
  })

  // 미리보기 줌
  const [previewZoom, setPreviewZoom] = useState(1)

  // Upload state
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // 비밀번호 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // 애셋 체크 상태
  const [showAssetCheckModal, setShowAssetCheckModal] = useState(false)
  const [assetCheckResults, setAssetCheckResults] = useState<AssetCheckResult[]>([])
  const [isCheckingAssets, setIsCheckingAssets] = useState(false)

  // 훅
  const { compile, isCompiling, progress: compileProgress } = useImageCompiler()

  // 프로젝트 로드
  useEffect(() => {
    if (!id) return

    const fetchProject = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`${API_URL}/projects/${id}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('프로젝트를 불러오지 못했습니다.')
        const data: Project = await res.json()
        setProject(data)

        // 멀티 미디어 아이템 로드 (있는 경우)
        let loadedItems: MediaItem[] = []
        if (data.mediaItems && data.mediaItems.length > 0) {
          loadedItems = data.mediaItems.map(item => ({
            id: item.id,
            type: item.type as 'video' | 'image',
            mode: item.mode as 'tracking' | 'basic',
            file: null,
            previewFile: null,
            existingFileId: item.fileId,
            existingPreviewFileId: item.previewFileId,
            aspectRatio: item.aspectRatio ?? 16 / 9,
            position: {
              x: item.positionX ?? 0.5,
              y: item.positionY ?? 0.5,
            },
            scale: item.scale ?? 1,
            chromaKeyEnabled: item.chromaKeyEnabled ?? false,
            chromaKeyColor: item.chromaKeyColor ?? '#00FF00',
            chromaKeySettings: {
              similarity: item.chromaKeySimilarity ?? DEFAULT_CHROMAKEY_SETTINGS.similarity,
              smoothness: item.chromaKeySmoothness ?? DEFAULT_CHROMAKEY_SETTINGS.smoothness,
            },
            flatView: item.flatView ?? false,
            linkUrl: item.linkUrl ?? '',
            linkEnabled: item.linkEnabled ?? false,
            order: item.order ?? 0,
            isCollapsed: true,
          }))
        }

        setFormState({
          title: data.title || '',
          cameraResolution: data.cameraResolution || 'fhd',
          videoQuality: data.videoQuality || 'low',
          thumbnailFile: null,
          targetImageFiles: [],
          guideImageFile: null,
          mediaItems: loadedItems,
          selectedMediaItemId: null,
          highPrecision: data.highPrecision || false,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [id])

  // Form state 변경 핸들러
  const handleFormChange = useCallback((updates: Partial<ProjectFormState>) => {
    setFormState(prev => ({ ...prev, ...updates }))
  }, [])

  // 멀티 미디어 아이템 위치 변경
  const handleMediaItemPositionChange = useCallback((id: string, position: { x: number; y: number }) => {
    setFormState(prev => ({
      ...prev,
      mediaItems: prev.mediaItems.map(item =>
        item.id === id ? { ...item, position } : item
      ),
    }))
  }, [])

  // 멀티 미디어 아이템 스케일 변경
  const handleMediaItemScaleChange = useCallback((id: string, scale: number) => {
    setFormState(prev => ({
      ...prev,
      mediaItems: prev.mediaItems.map(item =>
        item.id === id ? { ...item, scale } : item
      ),
    }))
  }, [])

  // 트래킹 모드 미디어가 있는지 확인
  const hasTrackingItems = useMemo(() => {
    return formState.mediaItems.some(item => item.mode === 'tracking')
  }, [formState.mediaItems])

  // 트래킹 모드 미디어가 있으면 타겟 이미지 필요 (기존 타겟 이미지가 없고 새로 업로드도 안 한 경우)
  const needsTargetImage = hasTrackingItems && !project?.targetImageFileId && formState.targetImageFiles.length === 0

  const canSave =
    !isUploading &&
    !isCompiling &&
    !needsTargetImage

  // 저장 버튼 클릭 시 비밀번호 모달 열기
  const handleSaveClick = () => {
    if (!canSave || !id) return

    setPasswordError(null)
    setShowPasswordModal(true)
  }

  // 비밀번호 확인 후 (필요시 컴파일 +) 업로드
  const handlePasswordSubmit = async (password: string) => {
    if (!canSave || !id) return

    const {
      title,
      cameraResolution,
      videoQuality,
      thumbnailFile,
      targetImageFiles,
      guideImageFile,
      mediaItems,
      highPrecision,
    } = formState

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
      formData.append('cameraResolution', cameraResolution)
      formData.append('videoQuality', videoQuality)
      formData.append('highPrecision', highPrecision ? 'true' : 'false')

      // 썸네일 이미지 전송 (있는 경우)
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile)
      }
      // 안내문구 이미지 전송 (있는 경우)
      if (guideImageFile) {
        formData.append('guideImage', guideImageFile)
      }

      // 새 타겟 이미지가 있으면 컴파일 후 추가 (트래킹 아이템이 있을 때만)
      if (hasTrackingItems && targetImageFiles.length > 0) {
        const { targetBuffer, originalImage } = await compile(targetImageFiles, {
          highPrecision,
        })
        const blob = new Blob([targetBuffer], { type: 'application/octet-stream' })
        formData.append('target', blob, 'targets.mind')
        formData.append('targetImage', originalImage)
      }

      // 멀티 미디어 아이템 추가
      if (mediaItems.length > 0) {
        // 미디어 아이템 메타데이터 JSON
        const mediaItemsMetadata = mediaItems.map((item, index) => ({
          id: item.existingFileId ? item.id : undefined, // 기존 아이템만 ID 전송
          type: item.type,
          mode: item.mode,
          positionX: item.position.x,
          positionY: item.position.y,
          scale: item.scale,
          aspectRatio: item.aspectRatio,
          chromaKeyEnabled: item.chromaKeyEnabled,
          chromaKeyColor: item.chromaKeyColor,
          chromaKeySimilarity: item.chromaKeySettings?.similarity,
          chromaKeySmoothness: item.chromaKeySettings?.smoothness,
          flatView: item.flatView,
          linkEnabled: item.linkEnabled,
          linkUrl: item.linkUrl,
          order: index,
        }))
        formData.append('mediaItems', JSON.stringify(mediaItemsMetadata))

        // 미디어 파일 추가
        for (let i = 0; i < mediaItems.length; i++) {
          const item = mediaItems[i]
          if (item.file) {
            formData.append(`media_${i}_file`, item.file)
          }
          if (item.previewFile) {
            formData.append(`media_${i}_preview`, item.previewFile)
          }
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

      // React Query 캐시 무효화 (새 영상이 즉시 반영되도록)
      await queryClient.invalidateQueries({ queryKey: ['arData', res.folderId] })

      navigate(`/result/qr/${res.folderId}`)
    } catch (err) {
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
    if (isUploading) return `저장 중 (${progress}%)`
    return '편집 모드'
  }, [isCompiling, isUploading, compileProgress, progress])

  // 애셋 체크 함수
  const handleAssetCheck = useCallback(async () => {
    if (!project) return

    setIsCheckingAssets(true)
    setShowAssetCheckModal(true)

    // 체크할 애셋 목록 생성
    const assets: AssetCheckResult[] = []

    // 썸네일 이미지
    if (project.thumbnailFileId) {
      assets.push({
        name: '썸네일 이미지',
        url: `${API_URL}/file/${project.thumbnailFileId}`,
        status: 'pending',
      })
    }

    // 타겟 이미지
    if (project.targetImageFileId) {
      assets.push({
        name: '타겟 이미지',
        url: `${API_URL}/file/${project.targetImageFileId}`,
        status: 'pending',
      })
    }

    // .mind 파일
    if (project.targetFileId) {
      assets.push({
        name: '타겟 파일 (.mind)',
        url: `${API_URL}/file/${project.targetFileId}`,
        status: 'pending',
      })
    }

    // 안내 이미지
    if (project.guideImageFileId) {
      assets.push({
        name: '안내문구 이미지',
        url: `${API_URL}/file/${project.guideImageFileId}`,
        status: 'pending',
      })
    }

    // 미디어 아이템들
    formState.mediaItems.forEach((item, index) => {
      if (item.existingFileId) {
        assets.push({
          name: `미디어 ${index + 1} (${item.type === 'video' ? '영상' : '이미지'}, ${item.mode === 'tracking' ? '트래킹' : '기본'})`,
          url: `${API_URL}/file/${item.existingFileId}`,
          status: 'pending',
        })
      }
      if (item.existingPreviewFileId) {
        assets.push({
          name: `미디어 ${index + 1} 프리뷰`,
          url: `${API_URL}/file/${item.existingPreviewFileId}`,
          status: 'pending',
        })
      }
    })

    setAssetCheckResults(assets)

    // 각 애셋 체크
    const checkAsset = async (asset: AssetCheckResult, index: number) => {
      setAssetCheckResults(prev =>
        prev.map((a, i) => (i === index ? { ...a, status: 'loading' } : a))
      )

      try {
        const response = await fetch(asset.url, { method: 'HEAD' })
        if (response.ok) {
          setAssetCheckResults(prev =>
            prev.map((a, i) => (i === index ? { ...a, status: 'success' } : a))
          )
        } else {
          setAssetCheckResults(prev =>
            prev.map((a, i) =>
              i === index
                ? { ...a, status: 'error', error: `HTTP ${response.status}` }
                : a
            )
          )
        }
      } catch (err) {
        setAssetCheckResults(prev =>
          prev.map((a, i) =>
            i === index
              ? { ...a, status: 'error', error: err instanceof Error ? err.message : '네트워크 오류' }
              : a
          )
        )
      }
    }

    // 모든 애셋을 순차적으로 체크
    for (let i = 0; i < assets.length; i++) {
      await checkAsset(assets[i], i)
    }

    setIsCheckingAssets(false)
  }, [project, formState.mediaItems])

  // 기존 데이터 (ProjectForm에 전달)
  const existingData: ProjectFormExistingData | undefined = project ? {
    thumbnailUrl: project.thumbnailFileId ? `${API_URL}/file/${project.thumbnailFileId}` : undefined,
    targetImageUrl: project.targetImageFileId ? `${API_URL}/file/${project.targetImageFileId}` : undefined,
    guideImageUrl: project.guideImageFileId ? `${API_URL}/file/${project.guideImageFileId}` : undefined,
  } : undefined

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

  // Footer (저장 버튼 영역)
  const formFooter = (
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
          variant='outline'
          onClick={handleAssetCheck}
          disabled={isUploading || isCompiling || isCheckingAssets}
          className='flex-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        >
          {isCheckingAssets ? '확인 중...' : '애셋확인'}
        </Button>
        <Button
          onClick={handleSaveClick}
          disabled={!canSave}
          className='flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
        >
          {isCompiling ? '컴파일 중...' : isUploading ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  )

  // 설정 패널 (좌측)
  const settingsPanel = (
    <ProjectForm
      state={formState}
      onChange={handleFormChange}
      existingData={existingData}
      disabled={isUploading || isCompiling}
      stepMessage='프로젝트 편집'
      workflowStatus={workflowStatus}
      footer={formFooter}
      hasExistingTargetImage={!!project.targetImageFileId}
    />
  )

  // 미리보기 패널 (우측)
  const previewPanel = (
    <UnifiedPreviewCanvas
      items={formState.mediaItems}
      selectedItemId={formState.selectedMediaItemId}
      onItemSelect={(id) => handleFormChange({ selectedMediaItemId: id })}
      onItemPositionChange={handleMediaItemPositionChange}
      onItemScaleChange={handleMediaItemScaleChange}
      zoom={previewZoom}
      onZoomChange={setPreviewZoom}
    />
  )

  return (
    <PageBackground>
      <div className='container mx-auto px-4 py-12'>
        <div className='mx-auto max-w-6xl space-y-10'>
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

          <TwoColumnLayout
            leftPanel={settingsPanel}
            rightPanel={previewPanel}
          />
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

      {/* 애셋 체크 모달 */}
      {showAssetCheckModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col'>
            <div className='p-4 border-b'>
              <h3 className='text-lg font-semibold text-gray-900'>애셋 확인</h3>
              <p className='text-sm text-gray-500 mt-1'>
                모든 미디어 파일의 로드 상태를 확인합니다.
              </p>
            </div>

            <div className='flex-1 overflow-y-auto p-4 space-y-3'>
              {assetCheckResults.length === 0 ? (
                <p className='text-gray-500 text-center py-4'>
                  확인할 애셋이 없습니다.
                </p>
              ) : (
                assetCheckResults.map((result, index) => (
                  <div
                    key={index}
                    className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'
                  >
                    <div className='flex-shrink-0'>
                      {result.status === 'pending' && (
                        <div className='w-5 h-5 rounded-full bg-gray-300' />
                      )}
                      {result.status === 'loading' && (
                        <Loader2 className='w-5 h-5 text-blue-500 animate-spin' />
                      )}
                      {result.status === 'success' && (
                        <CheckCircle className='w-5 h-5 text-green-500' />
                      )}
                      {result.status === 'error' && (
                        <XCircle className='w-5 h-5 text-red-500' />
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-900 truncate'>
                        {result.name}
                      </p>
                      {result.status === 'error' && result.error && (
                        <p className='text-xs text-red-500 mt-0.5'>
                          {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className='p-4 border-t bg-gray-50'>
              <div className='flex items-center justify-between mb-3'>
                <div className='text-sm'>
                  {isCheckingAssets ? (
                    <span className='text-blue-600'>확인 중...</span>
                  ) : (
                    <>
                      <span className='text-green-600'>
                        성공: {assetCheckResults.filter(r => r.status === 'success').length}
                      </span>
                      <span className='mx-2 text-gray-400'>|</span>
                      <span className='text-red-600'>
                        실패: {assetCheckResults.filter(r => r.status === 'error').length}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setShowAssetCheckModal(false)}
                className='w-full'
                disabled={isCheckingAssets}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageBackground>
  )
}
