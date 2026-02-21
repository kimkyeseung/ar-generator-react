import { useCallback } from 'react'
import { Video, Image as ImageIcon, Trash2 } from 'lucide-react'
import TargetImageUpload from './TargetImageUpload'
import ThumbnailUpload from './ThumbnailUpload'
import OverlayImageUpload from './OverlayImageUpload'
import GuideImageUpload from './GuideImageUpload'
import ArOptionsSection from './home/ArOptionsSection'
import CameraResolutionSelector from './home/CameraResolutionSelector'
import ModeSelector from './home/ModeSelector'
import UploadCard from './home/UploadCard'
import VideoQualitySelector from './home/VideoQualitySelector'
import MediaItemEditor from './media/MediaItemEditor'
import { CollapsibleSection } from './ui/CollapsibleSection'
import {
  CameraResolution,
  ProjectMode,
  VideoQuality,
  MediaItem,
  MediaType,
  createDefaultMediaItem,
} from '../types/project'

let mediaItemIdCounter = 0
const generateMediaItemId = () => `media-${Date.now()}-${++mediaItemIdCounter}`

export interface ProjectFormState {
  title: string
  mode: ProjectMode
  cameraResolution: CameraResolution
  videoQuality: VideoQuality
  thumbnailFile: File | null
  targetImageFiles: File[]
  guideImageFile: File | null
  overlayImageFile: File | null
  overlayLinkUrl: string
  mediaItems: MediaItem[]
  selectedMediaItemId: string | null
  highPrecision: boolean
}

export interface ProjectFormExistingData {
  thumbnailUrl?: string
  targetImageUrl?: string
  guideImageUrl?: string
  overlayImageUrl?: string
}

export interface ProjectFormProps {
  state: ProjectFormState
  onChange: (updates: Partial<ProjectFormState>) => void
  existingData?: ProjectFormExistingData
  disabled: boolean
  stepMessage: string
  workflowStatus: string
  footer: React.ReactNode
  /** Edit mode: 기존 타겟 이미지가 있어서 새 타겟 이미지가 선택사항인 경우 */
  hasExistingTargetImage?: boolean
}

export default function ProjectForm({
  state,
  onChange,
  existingData,
  disabled,
  stepMessage,
  workflowStatus,
  footer,
  hasExistingTargetImage = false,
}: ProjectFormProps) {
  const {
    title,
    mode,
    cameraResolution,
    videoQuality,
    thumbnailFile,
    targetImageFiles,
    guideImageFile,
    overlayImageFile,
    overlayLinkUrl,
    mediaItems,
    selectedMediaItemId,
    highPrecision,
  } = state

  // 모드 변경 핸들러
  const handleModeChange = useCallback((newMode: ProjectMode) => {
    const updates: Partial<ProjectFormState> = { mode: newMode }
    // 기본 모드로 변경 시 AR 관련 상태 초기화
    if (newMode === 'basic') {
      updates.targetImageFiles = []
      updates.highPrecision = false
    }
    onChange(updates)
  }, [onChange])

  // 미디어 아이템 추가
  const handleAddItem = useCallback((type: MediaType) => {
    const newItem = createDefaultMediaItem(
      generateMediaItemId(),
      type,
      mediaItems.length
    )
    onChange({
      mediaItems: [...mediaItems, newItem],
      selectedMediaItemId: newItem.id,
    })
  }, [mediaItems, onChange])

  // 미디어 아이템 삭제
  const handleRemoveItem = useCallback((id: string) => {
    const newItems = mediaItems
      .filter(item => item.id !== id)
      .map((item, index) => ({ ...item, order: index }))

    let newSelectedId = selectedMediaItemId
    if (selectedMediaItemId === id) {
      newSelectedId = newItems.length > 0 ? newItems[0].id : null
    }

    onChange({
      mediaItems: newItems,
      selectedMediaItemId: newSelectedId,
    })
  }, [mediaItems, selectedMediaItemId, onChange])

  // 미디어 아이템 변경
  const handleItemChange = useCallback((id: string, updates: Partial<MediaItem>) => {
    onChange({
      mediaItems: mediaItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })
  }, [mediaItems, onChange])

  // 미디어 아이템 순서 변경
  const handleMoveItem = useCallback((id: string, direction: 'up' | 'down') => {
    const currentIndex = mediaItems.findIndex(item => item.id === id)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= mediaItems.length) return

    const newItems = [...mediaItems]
    const [removed] = newItems.splice(currentIndex, 1)
    newItems.splice(newIndex, 0, removed)

    onChange({
      mediaItems: newItems.map((item, index) => ({ ...item, order: index })),
    })
  }, [mediaItems, onChange])

  // AR 모드에서 타겟 이미지가 필요한지 확인
  const needsTargetImage = mode === 'ar' && !hasExistingTargetImage && targetImageFiles.length === 0

  return (
    <UploadCard
      stepMessage={stepMessage}
      status={workflowStatus}
    >
      {/* 기본 정보 */}
      <div className='space-y-4'>
        {/* 프로젝트 제목 */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            프로젝트 제목 {hasExistingTargetImage ? '' : '(선택)'}
          </label>
          <input
            type='text'
            value={title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder='프로젝트 제목을 입력하세요'
            className='w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
          />
        </div>

        {/* 썸네일 이미지 업로드 */}
        <ThumbnailUpload
          file={thumbnailFile}
          existingThumbnailUrl={existingData?.thumbnailUrl}
          onFileSelect={(file) => onChange({ thumbnailFile: file })}
          disabled={disabled}
        />

        {/* 모드 선택 */}
        <ModeSelector
          mode={mode}
          onModeChange={handleModeChange}
          disabled={disabled}
        />
        {mode === 'ar' && hasExistingTargetImage && !existingData?.targetImageUrl && (
          <p className='text-xs text-amber-600'>
            AR 모드로 변경하면 타겟 이미지를 업로드해야 합니다.
          </p>
        )}

        {/* 안내문구 이미지 */}
        <GuideImageUpload
          file={guideImageFile}
          existingImageUrl={existingData?.guideImageUrl}
          onFileSelect={(file) => onChange({ guideImageFile: file })}
          disabled={disabled}
        />

        {/* 카메라 해상도 선택 */}
        <CameraResolutionSelector
          resolution={cameraResolution}
          onResolutionChange={(resolution) => onChange({ cameraResolution: resolution })}
          disabled={disabled}
        />
      </div>

      {/* 영상/이미지 추가 버튼 */}
      <div className='grid grid-cols-2 gap-3 mt-4'>
        <button
          type="button"
          onClick={() => handleAddItem('video')}
          disabled={disabled}
          className="flex flex-col items-center justify-center gap-2 py-5 px-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        >
          <Video size={24} className="text-purple-600" />
          <span className="font-medium text-gray-700">영상 추가하기</span>
        </button>
        <button
          type="button"
          onClick={() => handleAddItem('image')}
          disabled={disabled}
          className="flex flex-col items-center justify-center gap-2 py-5 px-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        >
          <ImageIcon size={24} className="text-blue-600" />
          <span className="font-medium text-gray-700">이미지 추가하기</span>
        </button>
      </div>

      {/* 현재 에셋 미리보기 (Edit 모드에서 기존 타겟 이미지 표시) */}
      {mode === 'ar' && existingData?.targetImageUrl && targetImageFiles.length === 0 && (
        <CollapsibleSection title="현재 에셋" defaultOpen={true} className="mt-4">
          <div className='flex gap-4 flex-wrap'>
            <div className='flex flex-col items-center'>
              <img
                src={existingData.targetImageUrl}
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
              onHighPrecisionChange={(value) => onChange({ highPrecision: value })}
            />
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                타겟 이미지 {needsTargetImage ? '(필수)' : '변경 (선택)'}
                {needsTargetImage && <span className='text-red-500 ml-1'>*</span>}
              </label>
              <TargetImageUpload
                files={targetImageFiles}
                onFileSelect={(files) => onChange({ targetImageFiles: files })}
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

      {/* 미디어 아이템들 (각각 CollapsibleSection) */}
      {mediaItems.length === 0 && (
        <div className="mt-4 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500 text-sm">
            영상이나 이미지를 추가하세요
          </p>
        </div>
      )}

      {mediaItems
        .sort((a, b) => a.order - b.order)
        .map((item, index) => (
          <CollapsibleSection
            key={item.id}
            title={
              <div className="flex items-center gap-2">
                {item.type === 'video' ? (
                  <Video size={16} className="text-purple-500" />
                ) : (
                  <ImageIcon size={16} className="text-blue-500" />
                )}
                <span>{item.type === 'video' ? '영상' : '이미지'} {index + 1}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  item.mode === 'tracking'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {item.mode === 'tracking' ? '트래킹' : '기본'}
                </span>
                {(item.file || item.existingFileId) && (
                  <span className="text-xs text-green-600">✓</span>
                )}
              </div>
            }
            defaultOpen={selectedMediaItemId === item.id}
            className="mt-4"
            headerRight={
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveItem(item.id)
                }}
                disabled={disabled}
                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            }
          >
            <MediaItemEditor
              item={item}
              onChange={(updates) => handleItemChange(item.id, updates)}
              disabled={disabled}
              canMoveUp={index > 0}
              canMoveDown={index < mediaItems.length - 1}
              onMoveUp={() => handleMoveItem(item.id, 'up')}
              onMoveDown={() => handleMoveItem(item.id, 'down')}
            />
          </CollapsibleSection>
        ))}

      {/* 영상 품질 선택 */}
      {mediaItems.length > 0 && (
        <div className="mt-4">
          <VideoQualitySelector
            quality={videoQuality}
            onQualityChange={(quality) => onChange({ videoQuality: quality })}
            disabled={disabled}
          />
        </div>
      )}

      {/* 추가 옵션 */}
      <CollapsibleSection title="추가 옵션" defaultOpen={false} className="mt-4">
        <div className='space-y-4'>
          {/* 오버레이 이미지 편집 */}
          <OverlayImageUpload
            file={overlayImageFile}
            linkUrl={overlayLinkUrl}
            existingImageUrl={existingData?.overlayImageUrl}
            onFileSelect={(file) => onChange({ overlayImageFile: file })}
            onLinkUrlChange={(url) => onChange({ overlayLinkUrl: url })}
            disabled={disabled}
          />
        </div>
      </CollapsibleSection>

      {/* Footer (저장/배포 버튼 영역) */}
      {footer}
    </UploadCard>
  )
}
