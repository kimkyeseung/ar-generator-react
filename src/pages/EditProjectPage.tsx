import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import TargetImageUpload from '../components/TargetImageUpload'
import ThumbnailUpload from '../components/ThumbnailUpload'
import OverlayImageUpload from '../components/OverlayImageUpload'
import GuideImageUpload from '../components/GuideImageUpload'
import ArOptionsSection from '../components/home/ArOptionsSection'
import CameraResolutionSelector from '../components/home/CameraResolutionSelector'
import HeroHeader from '../components/home/HeroHeader'
import ModeSelector from '../components/home/ModeSelector'
import PageBackground from '../components/home/PageBackground'
import UploadCard from '../components/home/UploadCard'
import VideoQualitySelector from '../components/home/VideoQualitySelector'
import PasswordModal from '../components/PasswordModal'
import MediaItemList from '../components/media/MediaItemList'
import UnifiedPreviewCanvas from '../components/preview/UnifiedPreviewCanvas'
import TwoColumnLayout from '../components/layout/TwoColumnLayout'
import { CollapsibleSection } from '../components/ui/CollapsibleSection'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import {
  CameraResolution,
  DEFAULT_CHROMAKEY_SETTINGS,
  Project,
  ProjectMode,
  VideoQuality,
  MediaItem,
} from '../types/project'
import { useImageCompiler } from '../hooks/useImageCompiler'
import { API_URL } from '../config/api'
import { verifyPassword } from '../utils/auth'

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<ProjectMode>('ar')
  const [cameraResolution, setCameraResolution] = useState<CameraResolution>('fhd')
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('low')
  const [targetImageFiles, setTargetImageFiles] = useState<File[]>([])
  const [highPrecision, setHighPrecision] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)

  // 오버레이 이미지 상태
  const [overlayImageFile, setOverlayImageFile] = useState<File | null>(null)
  const [overlayLinkUrl, setOverlayLinkUrl] = useState<string>('')

  // 안내문구 이미지 상태
  const [guideImageFile, setGuideImageFile] = useState<File | null>(null)

  // 멀티 미디어 아이템 상태
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [selectedMediaItemId, setSelectedMediaItemId] = useState<string | null>(null)

  // 미리보기 줌
  const [previewZoom, setPreviewZoom] = useState(1)

  // Upload state
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // 비밀번호 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

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
        setTitle(data.title || '')
        setMode(data.mode || 'ar')
        setCameraResolution(data.cameraResolution || 'fhd')
        if (data.highPrecision) {
          setHighPrecision(data.highPrecision)
        }
        // DB에 저장된 영상 품질 불러오기
        const savedQuality: VideoQuality = data.videoQuality || 'low'
        setVideoQuality(savedQuality)
        // 오버레이 링크 URL 불러오기
        if (data.overlayLinkUrl) {
          setOverlayLinkUrl(data.overlayLinkUrl)
        }
        // 멀티 미디어 아이템 로드 (있는 경우)
        if (data.mediaItems && data.mediaItems.length > 0) {
          const loadedItems: MediaItem[] = data.mediaItems.map(item => ({
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
          setMediaItems(loadedItems)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [id])

  // 모드 변경 핸들러
  const handleModeChange = useCallback((newMode: ProjectMode) => {
    setMode(newMode)
    // 기본 모드로 변경 시 AR 관련 상태 초기화
    if (newMode === 'basic') {
      setTargetImageFiles([])
      setHighPrecision(false)
    }
  }, [])

  // 영상 품질 변경 (미디어 아이템에 적용됨)
  const handleVideoQualityChange = useCallback((quality: VideoQuality) => {
    setVideoQuality(quality)
  }, [])

  const handleTargetImageSelect = useCallback((files: File[]) => {
    setTargetImageFiles(files)
  }, [])

  // 멀티 미디어 아이템 위치 변경
  const handleMediaItemPositionChange = useCallback((id: string, position: { x: number; y: number }) => {
    setMediaItems(items =>
      items.map(item =>
        item.id === id ? { ...item, position } : item
      )
    )
  }, [])

  // 멀티 미디어 아이템 스케일 변경
  const handleMediaItemScaleChange = useCallback((id: string, scale: number) => {
    setMediaItems(items =>
      items.map(item =>
        item.id === id ? { ...item, scale } : item
      )
    )
  }, [])

  // AR 모드로 변경 시 타겟 이미지가 필요한지 확인
  const needsTargetImage = mode === 'ar' && !project?.targetImageFileId && targetImageFiles.length === 0

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
      formData.append('mode', mode)
      formData.append('cameraResolution', cameraResolution)
      formData.append('videoQuality', videoQuality)
      formData.append('highPrecision', highPrecision ? 'true' : 'false')

      // 썸네일 이미지 전송 (있는 경우)
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile)
      }
      // 오버레이 이미지 전송 (있는 경우)
      if (overlayImageFile) {
        formData.append('overlayImage', overlayImageFile)
      }
      // 오버레이 링크 URL 전송
      formData.append('overlayLinkUrl', overlayLinkUrl)
      // 안내문구 이미지 전송 (있는 경우)
      if (guideImageFile) {
        formData.append('guideImage', guideImageFile)
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

  // 설정 패널 (좌측)
  const settingsPanel = (
    <UploadCard
      stepMessage='프로젝트 편집'
      status={workflowStatus}
    >
      {/* 기본 정보 */}
      <CollapsibleSection title="기본 정보" defaultOpen={true}>
        <div className='space-y-4'>
          {/* 프로젝트 제목 */}
          <div>
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

          {/* 썸네일 이미지 업로드 */}
          <ThumbnailUpload
            file={thumbnailFile}
            existingThumbnailUrl={project.thumbnailFileId ? `${API_URL}/file/${project.thumbnailFileId}` : undefined}
            onFileSelect={setThumbnailFile}
            disabled={isUploading || isCompiling}
          />

          {/* 모드 선택 */}
          <ModeSelector
            mode={mode}
            onModeChange={handleModeChange}
            disabled={isUploading || isCompiling}
          />
          {mode === 'ar' && project.mode === 'basic' && (
            <p className='text-xs text-amber-600'>
              AR 모드로 변경하면 타겟 이미지를 업로드해야 합니다.
            </p>
          )}

          {/* 카메라 해상도 선택 */}
          <CameraResolutionSelector
            resolution={cameraResolution}
            onResolutionChange={setCameraResolution}
            disabled={isUploading || isCompiling}
          />
        </div>
      </CollapsibleSection>

      {/* 현재 에셋 미리보기 (AR 모드에서 타겟 이미지만 표시) */}
      {mode === 'ar' && project.targetImageFileId && targetImageFiles.length === 0 && (
        <CollapsibleSection title="현재 에셋" defaultOpen={true} className="mt-4">
          <div className='flex gap-4 flex-wrap'>
            <div className='flex flex-col items-center'>
              <img
                src={`${API_URL}/file/${project.targetImageFileId}`}
                alt='현재 타겟 이미지'
                className='w-32 h-32 object-cover rounded-lg border border-gray-200'
              />
              <span className='text-xs text-gray-500 mt-1'>타겟 이미지</span>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* AR 설정 (AR 모드에서만) */}
      {mode === 'ar' && (
        <CollapsibleSection title="AR 설정" defaultOpen={true} className="mt-4">
          <div className='space-y-4'>
            <ArOptionsSection
              highPrecision={highPrecision}
              onHighPrecisionChange={setHighPrecision}
            />
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                타겟 이미지 {needsTargetImage ? '(필수)' : '변경 (선택)'}
                {needsTargetImage && <span className='text-red-500 ml-1'>*</span>}
              </label>
              <TargetImageUpload
                files={targetImageFiles}
                onFileSelect={handleTargetImageSelect}
              />
              {needsTargetImage && (
                <p className='text-xs text-red-500 mt-1'>
                  AR 모드에서는 타겟 이미지가 필요합니다.
                </p>
              )}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* 미디어 관리 (영상/이미지) */}
      <CollapsibleSection title="미디어 관리" defaultOpen={true} className="mt-4">
        <div className='space-y-4'>
          <MediaItemList
            items={mediaItems}
            onItemsChange={setMediaItems}
            disabled={isUploading || isCompiling}
            selectedItemId={selectedMediaItemId}
            onItemSelect={setSelectedMediaItemId}
          />

          {/* 영상 품질 선택 */}
          <VideoQualitySelector
            quality={videoQuality}
            onQualityChange={handleVideoQualityChange}
            disabled={isUploading || isCompiling}
          />
        </div>
      </CollapsibleSection>

      {/* 추가 옵션 */}
      <CollapsibleSection title="추가 옵션" defaultOpen={false} className="mt-4">
        <div className='space-y-4'>
          {/* 안내문구 이미지 */}
          <GuideImageUpload
            file={guideImageFile}
            existingImageUrl={project.guideImageFileId ? `${API_URL}/file/${project.guideImageFileId}` : undefined}
            onFileSelect={setGuideImageFile}
            disabled={isUploading || isCompiling}
          />

          {/* 오버레이 이미지 편집 */}
          <OverlayImageUpload
            file={overlayImageFile}
            linkUrl={overlayLinkUrl}
            existingImageUrl={project.overlayImageFileId ? `${API_URL}/file/${project.overlayImageFileId}` : undefined}
            onFileSelect={setOverlayImageFile}
            onLinkUrlChange={setOverlayLinkUrl}
            disabled={isUploading || isCompiling}
          />
        </div>
      </CollapsibleSection>

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
            {isCompiling ? '컴파일 중...' : isUploading ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </UploadCard>
  )

  // 미리보기 패널 (우측)
  const previewPanel = (
    <UnifiedPreviewCanvas
      items={mediaItems}
      selectedItemId={selectedMediaItemId}
      onItemSelect={setSelectedMediaItemId}
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
    </PageBackground>
  )
}
