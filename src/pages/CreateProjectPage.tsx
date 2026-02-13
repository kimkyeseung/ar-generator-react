import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import TargetImageUpload from '../components/TargetImageUpload'
import ThumbnailUpload from '../components/ThumbnailUpload'
import OverlayImageUpload from '../components/OverlayImageUpload'
import GuideImageUpload from '../components/GuideImageUpload'
import ArOptionsSection from '../components/home/ArOptionsSection'
import CameraResolutionSelector from '../components/home/CameraResolutionSelector'
import HeroHeader from '../components/home/HeroHeader'
import InfoFooter from '../components/home/InfoFooter'
import ModeSelector from '../components/home/ModeSelector'
import PageBackground from '../components/home/PageBackground'
import PublishSection from '../components/home/PublishSection'
import UploadCard from '../components/home/UploadCard'
import VideoQualitySelector from '../components/home/VideoQualitySelector'
import PasswordModal from '../components/PasswordModal'
import MediaItemList from '../components/media/MediaItemList'
import UnifiedPreviewCanvas from '../components/preview/UnifiedPreviewCanvas'
import TwoColumnLayout from '../components/layout/TwoColumnLayout'
import { CollapsibleSection } from '../components/ui/CollapsibleSection'
import { Button } from '../components/ui/button'
import { useImageCompiler } from '../hooks/useImageCompiler'
import {
  CameraResolution,
  ProjectMode,
  VideoQuality,
  MediaItem,
} from '../types/project'
import { API_URL } from '../config/api'
import { isValidHexColor } from '../utils/validation'
import { verifyPassword } from '../utils/auth'

export default function CreateProjectPage() {
  const [progress, setProgress] = useState<number>(0)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 모드 선택 (AR 모드 / 기본 모드)
  const [mode, setMode] = useState<ProjectMode>('ar')

  // 카메라 해상도 선택
  const [cameraResolution, setCameraResolution] = useState<CameraResolution>('fhd')

  // 영상 품질 선택
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('low')

  // 타겟 이미지 파일 (컴파일 전 원본) - AR 모드에서만 사용
  const [targetImageFiles, setTargetImageFiles] = useState<File[]>([])

  // 업로드/에러 상태
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // 옵션 상태
  const [title, setTitle] = useState<string>('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [highPrecision, setHighPrecision] = useState(false)

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

  // 비밀번호 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // 훅
  const { compile, isCompiling, progress: compileProgress } = useImageCompiler()

  const handleTargetImageSelect = useCallback((files: File[]) => {
    setTargetImageFiles(files)
  }, [])

  // 영상 품질 변경
  const handleVideoQualityChange = useCallback((quality: VideoQuality) => {
    setVideoQuality(quality)
  }, [])

  // 미디어 아이템 위치 변경
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

  // 퍼블리시 가능 여부
  // AR 모드: 타겟 이미지 파일 + 미디어 아이템 필요
  // 기본 모드: 미디어 아이템만 필요
  const canPublish = useMemo(() => {
    const hasMediaItems = mediaItems.some(item => item.file !== null)
    // 크로마키 검증: 크로마키 활성화된 아이템의 색상이 모두 유효한지 확인
    const hasValidChromaKey = mediaItems
      .filter(item => item.chromaKeyEnabled)
      .every(item => isValidHexColor(item.chromaKeyColor))

    if (mode === 'ar') {
      return targetImageFiles.length > 0 && hasMediaItems && hasValidChromaKey
    }
    // 기본 모드
    return hasMediaItems && hasValidChromaKey
  }, [mode, targetImageFiles.length, mediaItems])

  // 배포 버튼 클릭 시 비밀번호 모달 열기
  const handlePublishClick = () => {
    if (!canPublish || isUploading || isCompiling) return

    setPasswordError(null)
    setShowPasswordModal(true)
  }

  // 비밀번호 확인 후 컴파일 + 업로드 순차 실행
  const handlePasswordSubmit = async (password: string) => {
    if (!canPublish) return

    const mediaItemsWithFiles = mediaItems.filter(item => item.file !== null)

    // AR 모드에서는 타겟 이미지 필수
    if (mode === 'ar' && targetImageFiles.length === 0) return
    // 미디어 아이템 필수
    if (mediaItemsWithFiles.length === 0) return

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

      // 2. FormData 구성
      const formData = new FormData()

      // AR 모드: 타겟 이미지 컴파일 필요
      if (mode === 'ar') {
        const { targetBuffer, originalImage } = await compile(targetImageFiles, {
          highPrecision,
        })
        const blob = new Blob([targetBuffer], { type: 'application/octet-stream' })
        formData.append('target', blob, 'targets.mind')
        formData.append('targetImage', originalImage)
      }

      // 미디어 아이템 업로드
      const mediaItemsMetadata = mediaItemsWithFiles.map((item, index) => ({
        type: item.type,
        mode: item.mode,
        positionX: item.position.x,
        positionY: item.position.y,
        scale: item.scale,
        aspectRatio: item.aspectRatio,
        chromaKeyEnabled: item.chromaKeyEnabled,
        chromaKeyColor: item.chromaKeyColor,
        chromaKeySimilarity: item.chromaKeySettings.similarity,
        chromaKeySmoothness: item.chromaKeySettings.smoothness,
        flatView: item.flatView,
        linkEnabled: item.linkEnabled,
        linkUrl: item.linkUrl,
        order: index,
      }))
      formData.append('mediaItems', JSON.stringify(mediaItemsMetadata))

      // 미디어 파일들 추가
      mediaItemsWithFiles.forEach((item, index) => {
        if (item.file) {
          formData.append(`media_${index}_file`, item.file)
        }
        if (item.previewFile) {
          formData.append(`media_${index}_preview`, item.previewFile)
        }
      })

      formData.append('mode', mode)
      formData.append('cameraResolution', cameraResolution)
      formData.append('videoQuality', videoQuality)

      // 추적 정확도 향상 옵션 전송 (AR 모드에서만)
      if (mode === 'ar' && highPrecision) {
        formData.append('highPrecision', 'true')
      }
      if (title) {
        formData.append('title', title)
      }
      // 썸네일 이미지 전송 (있는 경우)
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile)
      }
      // 오버레이 이미지 전송 (있는 경우)
      if (overlayImageFile) {
        formData.append('overlayImage', overlayImageFile)
      }
      // 오버레이 링크 URL 전송 (있는 경우)
      if (overlayLinkUrl) {
        formData.append('overlayLinkUrl', overlayLinkUrl)
      }
      // 안내문구 이미지 전송 (있는 경우)
      if (guideImageFile) {
        formData.append('guideImage', guideImageFile)
      }

      // 3. 업로드
      const res = await uploadWithProgress(formData, password)

      // React Query 캐시 무효화 (새 프로젝트가 즉시 반영되도록)
      await queryClient.invalidateQueries({ queryKey: ['arData', res.folderId] })

      navigate(`/result/qr/${res.folderId}`)
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

      setUploadError(errorMessage)
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
    const hasMediaContent = mediaItems.some(item => item.file !== null)

    if (mode === 'ar') {
      if (targetImageFiles.length === 0) {
        return 'Step 1. 타겟 이미지를 업로드해주세요.'
      }
      if (!hasMediaContent) {
        return 'Step 2. 영상이나 이미지를 추가해주세요.'
      }
      return 'Step 3. 배포 버튼을 클릭하세요.'
    }
    // 기본 모드
    if (!hasMediaContent) {
      return 'Step 1. 영상이나 이미지를 추가해주세요.'
    }
    return 'Step 2. 위치를 조정하고 배포 버튼을 클릭하세요.'
  }, [mode, targetImageFiles.length, mediaItems])

  // 워크플로우 상태
  const workflowStatus = useMemo(() => {
    if (isCompiling) return `타겟 변환 중 (${Math.round(compileProgress)}%)`
    if (isUploading) return `업로드 중 (${progress}%)`
    if (canPublish) return '배포 준비 완료'
    return '파일을 업로드해주세요'
  }, [canPublish, isCompiling, isUploading, compileProgress, progress])

  // 설정 패널 (좌측)
  const settingsPanel = (
    <UploadCard
      stepMessage={stepMessage}
      status={workflowStatus}
    >
      {/* 프로젝트 제목 입력 */}
      <CollapsibleSection title="기본 정보" defaultOpen={true}>
        <div className='space-y-4'>
          <div>
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

          {/* 썸네일 이미지 업로드 */}
          <ThumbnailUpload
            file={thumbnailFile}
            onFileSelect={setThumbnailFile}
            disabled={isUploading || isCompiling}
          />

          {/* 모드 선택 */}
          <ModeSelector
            mode={mode}
            onModeChange={setMode}
            disabled={isUploading || isCompiling}
          />

          {/* 카메라 해상도 선택 */}
          <CameraResolutionSelector
            resolution={cameraResolution}
            onResolutionChange={setCameraResolution}
            disabled={isUploading || isCompiling}
          />
        </div>
      </CollapsibleSection>

      {/* AR 설정 - AR 모드에서만 표시 */}
      {mode === 'ar' && (
        <CollapsibleSection title="AR 설정" defaultOpen={true} className="mt-4">
          <div className='space-y-4'>
            <ArOptionsSection
              highPrecision={highPrecision}
              onHighPrecisionChange={setHighPrecision}
            />
            <TargetImageUpload
              files={targetImageFiles}
              onFileSelect={handleTargetImageSelect}
            />
          </div>
        </CollapsibleSection>
      )}

      {/* 안내문구 이미지 */}
      <CollapsibleSection title="안내문구 이미지" defaultOpen={false} className="mt-4">
        <GuideImageUpload
          file={guideImageFile}
          onFileSelect={setGuideImageFile}
          disabled={isUploading || isCompiling}
        />
      </CollapsibleSection>

      {/* 미디어 관리 (영상/이미지 추가) */}
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
          {/* 오버레이 이미지 업로드 */}
          <OverlayImageUpload
            file={overlayImageFile}
            linkUrl={overlayLinkUrl}
            onFileSelect={setOverlayImageFile}
            onLinkUrlChange={setOverlayLinkUrl}
            disabled={isUploading || isCompiling}
          />
        </div>
      </CollapsibleSection>

      {/* 배포 섹션 */}
      <div className="mt-6">
        <PublishSection
          canPublish={canPublish}
          onPublish={handlePublishClick}
          progress={isCompiling ? compileProgress : progress}
          isUploading={isUploading}
          isCompiling={isCompiling}
          uploadError={uploadError}
        />
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
      targetImageFile={targetImageFiles[0]}
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
