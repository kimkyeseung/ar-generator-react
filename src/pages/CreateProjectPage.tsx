import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import TargetImageUpload from '../components/TargetImageUpload'
import ThumbnailUpload from '../components/ThumbnailUpload'
import OverlayImageUpload from '../components/OverlayImageUpload'
import GuideImageUpload from '../components/GuideImageUpload'
import VideoPositionEditor from '../components/VideoPositionEditor'
import ArOptionsSection from '../components/home/ArOptionsSection'
import CameraResolutionSelector from '../components/home/CameraResolutionSelector'
import HeroHeader from '../components/home/HeroHeader'
import InfoFooter from '../components/home/InfoFooter'
import ModeSelector from '../components/home/ModeSelector'
import PageBackground from '../components/home/PageBackground'
import PublishSection from '../components/home/PublishSection'
import UploadCard from '../components/home/UploadCard'
import VideoUploadSection from '../components/home/VideoUploadSection'
import VideoQualitySelector from '../components/home/VideoQualitySelector'
import PasswordModal from '../components/PasswordModal'
import MediaItemList from '../components/media/MediaItemList'
import UnifiedPreviewCanvas from '../components/preview/UnifiedPreviewCanvas'
import TwoColumnLayout from '../components/layout/TwoColumnLayout'
import { CollapsibleSection } from '../components/ui/CollapsibleSection'
import { Button } from '../components/ui/button'
import { useVideoCompressor } from '../hooks/useVideoCompressor'
import { useImageCompiler } from '../hooks/useImageCompiler'
import {
  CameraResolution,
  ChromaKeySettings,
  DEFAULT_CHROMAKEY_SETTINGS,
  ProjectMode,
  VideoPosition,
  VideoQuality,
  MediaItem,
} from '../types/project'
import { API_URL } from '../config/api'
import { isValidHexColor } from '../utils/validation'
import { verifyPassword } from '../utils/auth'

const MAX_VIDEO_SIZE_MB = 32
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

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

  // 비디오 관련 상태 (레거시 - 단일 비디오)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [previewVideoFile, setPreviewVideoFile] = useState<File | null>(null)
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(1)
  const [videoError, setVideoError] = useState<string | null>(null)

  // 기본 모드: 비디오 위치/크기
  const [videoPosition, setVideoPosition] = useState<VideoPosition>({ x: 0.5, y: 0.5 })
  const [videoScale, setVideoScale] = useState<number>(1)

  // 업로드/에러 상태
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)

  // 옵션 상태
  const [title, setTitle] = useState<string>('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [useChromaKey, setUseChromaKey] = useState(false)
  const [chromaKeyColor, setChromaKeyColor] = useState('#00FF00')
  const [chromaKeySettings, setChromaKeySettings] = useState<ChromaKeySettings>(DEFAULT_CHROMAKEY_SETTINGS)
  const [chromaKeyError, setChromaKeyError] = useState<string | null>(null)
  const [flatView, setFlatView] = useState(false)
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
  const { compressVideo, compressionProgress, resetProgress } = useVideoCompressor()
  const { compile, isCompiling, progress: compileProgress } = useImageCompiler()

  const handleTargetImageSelect = useCallback((files: File[]) => {
    setTargetImageFiles(files)
  }, [])

  // 영상 품질 변경 시 재압축 (비디오가 이미 선택된 경우)
  const handleVideoQualityChange = useCallback(async (quality: VideoQuality) => {
    setVideoQuality(quality)

    // 비디오가 선택되어 있으면 재압축
    if (videoFile) {
      setIsCompressing(true)
      resetProgress()
      try {
        const { previewFile } = await compressVideo(videoFile, quality)
        setPreviewVideoFile(previewFile)
        if (previewFile) {
          console.log(
            `[Compressor] Re-compressed with ${quality}: ${(previewFile.size / 1024 / 1024).toFixed(2)}MB`
          )
        } else {
          console.log('[Compressor] High quality mode - no compression')
        }
      } catch (err) {
        console.warn('Re-compression failed:', err)
      } finally {
        setIsCompressing(false)
      }
    }
  }, [videoFile, compressVideo, resetProgress])

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

      // 영상 품질에 따라 압축 (백그라운드에서)
      setIsCompressing(true)
      try {
        const { previewFile } = await compressVideo(file, videoQuality)
        setPreviewVideoFile(previewFile)
        if (previewFile) {
          console.log(
            `[Compressor] Preview: ${(previewFile.size / 1024 / 1024).toFixed(2)}MB, Original: ${(file.size / 1024 / 1024).toFixed(2)}MB`
          )
        } else {
          console.log('[Compressor] High quality mode - no compression')
        }
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
  }, [compressVideo, videoQuality])

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

  // 퍼블리시 가능 여부
  // AR 모드: 타겟 이미지 파일 + (비디오 파일 또는 미디어 아이템) 필요
  // 기본 모드: (비디오 파일 또는 미디어 아이템)만 필요
  const canPublish = useMemo(() => {
    const hasVideo = videoFile !== null
    const hasMediaItems = mediaItems.some(item => item.file !== null)
    const hasContent = hasVideo || hasMediaItems
    const hasValidChromaKey = !useChromaKey || isValidHexColor(chromaKeyColor)

    if (mode === 'ar') {
      return targetImageFiles.length > 0 && hasContent && hasValidChromaKey
    }
    // 기본 모드
    return hasContent && hasValidChromaKey
  }, [mode, targetImageFiles.length, videoFile, mediaItems, useChromaKey, chromaKeyColor])

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

  // 비밀번호 확인 후 컴파일 + 업로드 순차 실행
  const handlePasswordSubmit = async (password: string) => {
    if (!canPublish) return

    const hasLegacyVideo = videoFile !== null
    const hasMediaItems = mediaItems.some(item => item.file !== null)

    // AR 모드에서는 타겟 이미지 필수
    if (mode === 'ar' && targetImageFiles.length === 0) return
    // 레거시 모드에서 비디오 필수
    if (!hasLegacyVideo && !hasMediaItems) return

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

      // 레거시 단일 비디오 업로드
      if (hasLegacyVideo && videoFile) {
        formData.append('video', videoFile)
        // 저화질 프리뷰 영상 추가 (있는 경우)
        if (previewVideoFile) {
          formData.append('previewVideo', previewVideoFile)
        }
        // 비디오 비율 전송 (width=1 고정, height=종횡비)
        formData.append('width', '1')
        formData.append('height', videoAspectRatio.toString())
        // 크로마키 설정 전송
        if (useChromaKey && chromaKeyColor) {
          formData.append('chromaKeyColor', chromaKeyColor)
          formData.append('chromaKeySimilarity', chromaKeySettings.similarity.toString())
          formData.append('chromaKeySmoothness', chromaKeySettings.smoothness.toString())
        }
        // 정면 고정 옵션 전송 (AR 모드에서만)
        if (mode === 'ar' && flatView) {
          formData.append('flatView', 'true')
        }
        // 기본 모드: 비디오 위치/크기 전송
        if (mode === 'basic') {
          formData.append('videoPosition', JSON.stringify(videoPosition))
          formData.append('videoScale', videoScale.toString())
        }
      }

      // 멀티 미디어 아이템 업로드
      if (hasMediaItems) {
        const mediaItemsWithFiles = mediaItems.filter(item => item.file !== null)

        // 미디어 아이템 메타데이터
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
      }

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
    if (mode === 'ar') {
      if (targetImageFiles.length === 0) {
        return 'Step 1. 타겟 이미지를 업로드해주세요.'
      }
      if (!videoFile && mediaItems.every(item => item.file === null)) {
        return 'Step 2. 타겟에 재생될 영상을 업로드해주세요.'
      }
      return 'Step 3. 배포 버튼을 클릭하세요.'
    }
    // 기본 모드
    if (!videoFile && mediaItems.every(item => item.file === null)) {
      return 'Step 1. 재생할 영상을 업로드해주세요.'
    }
    return 'Step 2. 영상 위치를 조정하고 배포 버튼을 클릭하세요.'
  }, [mode, targetImageFiles.length, videoFile, mediaItems])

  // 워크플로우 상태
  const workflowStatus = useMemo(() => {
    if (isCompiling) return `타겟 변환 중 (${Math.round(compileProgress)}%)`
    if (isCompressing) return compressionProgress?.message || '영상 압축 중'
    if (isUploading) return `업로드 중 (${progress}%)`
    if (canPublish) return '배포 준비 완료'
    return '파일을 업로드해주세요'
  }, [canPublish, isCompiling, isCompressing, isUploading, compileProgress, compressionProgress, progress])

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
            disabled={isUploading || isCompiling || isCompressing}
          />

          {/* 모드 선택 */}
          <ModeSelector
            mode={mode}
            onModeChange={setMode}
            disabled={isUploading || isCompiling || isCompressing}
          />

          {/* 카메라 해상도 선택 */}
          <CameraResolutionSelector
            resolution={cameraResolution}
            onResolutionChange={setCameraResolution}
            disabled={isUploading || isCompiling || isCompressing}
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

      {/* 비디오 업로드 */}
      <CollapsibleSection title="영상 설정" defaultOpen={true} className="mt-4">
        <div className='space-y-4'>
          <VideoUploadSection
            isTargetReady={mode === 'basic' || targetImageFiles.length > 0}
            videoFile={videoFile}
            onFileSelect={handleVideoSelect}
            limitMb={MAX_VIDEO_SIZE_MB}
            videoError={videoError}
            useChromaKey={useChromaKey}
            onUseChromaKeyChange={setUseChromaKey}
            chromaKeyColor={chromaKeyColor}
            onChromaKeyColorChange={handleChromaKeyColorChange}
            chromaKeySettings={chromaKeySettings}
            onChromaKeySettingsChange={setChromaKeySettings}
            chromaKeyError={chromaKeyError}
            flatView={flatView}
            onFlatViewChange={setFlatView}
            showFlatView={mode === 'ar'}
          />

          {/* 기본 모드: 비디오 위치/크기 편집 */}
          {mode === 'basic' && videoFile && (
            <div className='mt-4'>
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

          {/* 영상 품질 선택 */}
          <VideoQualitySelector
            quality={videoQuality}
            onQualityChange={handleVideoQualityChange}
            disabled={isUploading || isCompiling || isCompressing}
          />
        </div>
      </CollapsibleSection>

      {/* 멀티 미디어 아이템 (선택적) */}
      <CollapsibleSection title="추가 미디어" defaultOpen={false} className="mt-4">
        <MediaItemList
          items={mediaItems}
          onItemsChange={setMediaItems}
          disabled={isUploading || isCompiling || isCompressing}
          selectedItemId={selectedMediaItemId}
          onItemSelect={setSelectedMediaItemId}
        />
      </CollapsibleSection>

      {/* 추가 옵션 */}
      <CollapsibleSection title="추가 옵션" defaultOpen={false} className="mt-4">
        <div className='space-y-4'>
          {/* 안내문구 이미지 업로드 */}
          <GuideImageUpload
            file={guideImageFile}
            onFileSelect={setGuideImageFile}
            disabled={isUploading || isCompiling || isCompressing}
          />

          {/* 오버레이 이미지 업로드 */}
          <OverlayImageUpload
            file={overlayImageFile}
            linkUrl={overlayLinkUrl}
            onFileSelect={setOverlayImageFile}
            onLinkUrlChange={setOverlayLinkUrl}
            disabled={isUploading || isCompiling || isCompressing}
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
          isCompressing={isCompressing}
          compressionProgress={compressionProgress?.progress ?? 0}
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
