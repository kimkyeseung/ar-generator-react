import { useCallback, useMemo } from 'react'
import { Video, Image as ImageIcon, Trash2 } from 'lucide-react'
import TargetImageUpload from './TargetImageUpload'
import ThumbnailUpload from './ThumbnailUpload'
import GuideImageUpload from './GuideImageUpload'
import ArOptionsSection from './home/ArOptionsSection'
import CameraResolutionSelector from './home/CameraResolutionSelector'
import UploadCard from './home/UploadCard'
import VideoQualitySelector from './home/VideoQualitySelector'
import MediaItemEditor from './media/MediaItemEditor'
import { CollapsibleSection } from './ui/CollapsibleSection'
import {
  CameraResolution,
  VideoQuality,
  MediaItem,
  MediaType,
  createDefaultMediaItem,
} from '../types/project'

let mediaItemIdCounter = 0
const generateMediaItemId = () => `media-${Date.now()}-${++mediaItemIdCounter}`

export interface ProjectFormState {
  title: string
  cameraResolution: CameraResolution
  videoQuality: VideoQuality
  thumbnailFile: File | null
  targetImageFiles: File[]
  guideImageFile: File | null
  mediaItems: MediaItem[]
  selectedMediaItemId: string | null
  highPrecision: boolean
}

export interface ProjectFormExistingData {
  thumbnailUrl?: string
  targetImageUrl?: string
  guideImageUrl?: string
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
    cameraResolution,
    videoQuality,
    thumbnailFile,
    targetImageFiles,
    guideImageFile,
    mediaItems,
    selectedMediaItemId,
    highPrecision,
  } = state

  // 트래킹 모드 미디어 아이템 존재 여부
  const hasTrackingItems = useMemo(() => {
    return mediaItems.some(item => item.mode === 'tracking')
  }, [mediaItems])

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

  // 트래킹 모드 미디어가 있을 때 타겟 이미지가 필요한지 확인
  const needsTargetImage = hasTrackingItems && !hasExistingTargetImage && targetImageFiles.length === 0

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
      {hasTrackingItems && existingData?.targetImageUrl && targetImageFiles.length === 0 && (
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

      {/* 타겟 이미지 설정 */}
      <CollapsibleSection title="타겟 이미지" defaultOpen={true} className="mt-4">
        <div className='space-y-4'>
          {hasTrackingItems ? (
            <>
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
                    트래킹 모드 미디어가 있으면 타겟 이미지가 필요합니다.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className='text-sm text-gray-500 py-4 text-center'>
              현재는 타겟 이미지가 필요없습니다.
              <br />
              <span className='text-xs text-gray-400'>
                트래킹 모드 미디어를 추가하면 타겟 이미지를 설정할 수 있습니다.
              </span>
            </p>
          )}
        </div>
      </CollapsibleSection>

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

      {/* Footer (저장/배포 버튼 영역) */}
      {footer}
    </UploadCard>
  )
}
