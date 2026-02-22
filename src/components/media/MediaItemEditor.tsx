import { useCallback, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, Upload, X, Move, Maximize2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../ui/button'
import { MediaItem, MediaMode, DEFAULT_CHROMAKEY_SETTINGS } from '../../types/project'
import { isValidHexColor } from '../../utils/validation'

const MIN_SCALE = 0.2
const MAX_SCALE = 5.0
const SCALE_STEP = 0.1

interface MediaItemEditorProps {
  item: MediaItem
  onChange: (updates: Partial<MediaItem>) => void
  disabled?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export default function MediaItemEditor({
  item,
  onChange,
  disabled = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
}: MediaItemEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [chromaKeyOptionsExpanded, setChromaKeyOptionsExpanded] = useState(false)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 유형 검사
    if (item.type === 'video' && !file.type.startsWith('video/')) {
      alert('비디오 파일만 업로드할 수 있습니다.')
      return
    }
    if (item.type === 'image' && !file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    // 미디어 로드 후 종횡비 계산
    if (item.type === 'video') {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        const aspectRatio = video.videoWidth / video.videoHeight
        onChange({
          file,
          aspectRatio,
          existingFileId: null,
        })
        URL.revokeObjectURL(video.src)
      }
      video.src = URL.createObjectURL(file)
    } else {
      const img = new window.Image()
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight
        onChange({
          file,
          aspectRatio,
          existingFileId: null,
        })
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    }

    // 입력 필드 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [item.type, onChange])

  const handleModeChange = (mode: MediaMode) => {
    onChange({ mode })
  }

  const handleChromaKeyToggle = () => {
    onChange({
      chromaKeyEnabled: !item.chromaKeyEnabled,
      chromaKeySettings: item.chromaKeyEnabled
        ? item.chromaKeySettings
        : { ...DEFAULT_CHROMAKEY_SETTINGS },
    })
  }

  const handleChromaKeyColorChange = (color: string) => {
    onChange({ chromaKeyColor: color })
  }

  const handleLinkToggle = () => {
    onChange({ linkEnabled: !item.linkEnabled })
  }

  const handleLinkUrlChange = (url: string) => {
    onChange({ linkUrl: url })
  }

  const handleRemoveFile = () => {
    onChange({
      file: null,
      previewFile: null,
      existingFileId: null,
      existingPreviewFileId: null,
    })
  }

  const hasFile = item.file !== null || item.existingFileId !== null

  return (
    <div className="space-y-4">
      {/* 모드 선택 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          표시 모드
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={item.mode === 'tracking' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('tracking')}
            disabled={disabled}
            className={`flex-1 ${item.mode !== 'tracking' ? 'text-gray-700 border-gray-300' : ''}`}
          >
            트래킹
          </Button>
          <Button
            type="button"
            variant={item.mode === 'basic' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('basic')}
            disabled={disabled}
            className={`flex-1 ${item.mode !== 'basic' ? 'text-gray-700 border-gray-300' : ''}`}
          >
            기본
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {item.mode === 'tracking'
            ? '타겟 이미지 위에 표시됩니다'
            : '화면에 항상 표시됩니다'}
        </p>
      </div>

      {/* 위치/크기 조정 (기본 모드에서만) */}
      {item.mode === 'basic' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Move size={12} />
              위치 / 크기
            </label>
            <button
              type="button"
              onClick={() => onChange({ position: { x: 0.5, y: 0.5 }, scale: 1 })}
              disabled={disabled}
              className="text-xs text-purple-600 hover:text-purple-700"
            >
              초기화
            </button>
          </div>

          {/* 위치 조정 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">X 위치</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={item.position.x}
                onChange={(e) =>
                  onChange({
                    position: { ...item.position, x: parseFloat(e.target.value) },
                  })
                }
                disabled={disabled}
                className="w-full"
              />
              <div className="text-xs text-gray-400 text-center">
                {Math.round(item.position.x * 100)}%
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Y 위치</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={item.position.y}
                onChange={(e) =>
                  onChange({
                    position: { ...item.position, y: parseFloat(e.target.value) },
                  })
                }
                disabled={disabled}
                className="w-full"
              />
              <div className="text-xs text-gray-400 text-center">
                {Math.round(item.position.y * 100)}%
              </div>
            </div>
          </div>

          {/* 크기 조정 */}
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1">
              <Maximize2 size={10} />
              크기
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ scale: Math.max(MIN_SCALE, item.scale - SCALE_STEP) })}
                disabled={disabled || item.scale <= MIN_SCALE}
                className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 text-sm"
              >
                -
              </button>
              <input
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={SCALE_STEP}
                value={item.scale}
                onChange={(e) => onChange({ scale: parseFloat(e.target.value) })}
                disabled={disabled}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => onChange({ scale: Math.min(MAX_SCALE, item.scale + SCALE_STEP) })}
                disabled={disabled || item.scale >= MAX_SCALE}
                className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 text-sm"
              >
                +
              </button>
              <span className="w-12 text-right text-xs text-gray-500">
                {Math.round(item.scale * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 파일 업로드 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          {item.type === 'video' ? '영상 파일' : '이미지 파일'}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept={item.type === 'video' ? 'video/*' : 'image/*'}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />
        {hasFile ? (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1 truncate text-sm text-gray-700">
              {item.file?.name || '기존 파일'}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              disabled={disabled}
              className="h-8 w-8"
            >
              <X size={16} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="text-gray-700 border-gray-300"
            >
              변경
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-full gap-2 text-gray-700 border-gray-300"
          >
            <Upload size={16} />
            파일 선택
          </Button>
        )}
      </div>

      {/* 크로마키 설정 (영상에서만) */}
      {item.type === 'video' && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id={`chromakey-${item.id}`}
              checked={item.chromaKeyEnabled}
              onChange={handleChromaKeyToggle}
              disabled={disabled}
              className="rounded border-gray-300"
            />
            <label
              htmlFor={`chromakey-${item.id}`}
              className="text-xs font-medium text-gray-600"
            >
              크로마키 활성화
            </label>
          </div>
          {item.chromaKeyEnabled && (
            <div className="space-y-2 pl-6">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={item.chromaKeyColor}
                  onChange={(e) => handleChromaKeyColorChange(e.target.value)}
                  disabled={disabled}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={item.chromaKeyColor}
                  onChange={(e) => handleChromaKeyColorChange(e.target.value)}
                  disabled={disabled}
                  placeholder="#00FF00"
                  className="flex-1 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded bg-white"
                />
                {/* 세부 설정 토글 버튼 */}
                <button
                  type="button"
                  onClick={() => setChromaKeyOptionsExpanded(!chromaKeyOptionsExpanded)}
                  disabled={disabled}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  title={chromaKeyOptionsExpanded ? '옵션 접기' : '옵션 펼치기'}
                >
                  {chromaKeyOptionsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              {item.chromaKeyColor && !isValidHexColor(item.chromaKeyColor) && (
                <p className="text-xs text-red-500">
                  유효한 HEX 색상을 입력하세요
                </p>
              )}
              {/* 크로마키 세부 설정 (접기/펼치기) */}
              {chromaKeyOptionsExpanded && (
                <div
                  className="space-y-2 pt-2 border-t border-gray-100"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div>
                    <label className="text-xs text-gray-500">
                      색상 범위: {item.chromaKeySettings.similarity.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={item.chromaKeySettings.similarity}
                      onChange={(e) =>
                        onChange({
                          chromaKeySettings: {
                            ...item.chromaKeySettings,
                            similarity: parseFloat(e.target.value),
                          },
                        })
                      }
                      disabled={disabled}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      경계 부드러움: {item.chromaKeySettings.smoothness.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={item.chromaKeySettings.smoothness}
                      onChange={(e) =>
                        onChange({
                          chromaKeySettings: {
                            ...item.chromaKeySettings,
                            smoothness: parseFloat(e.target.value),
                          },
                        })
                      }
                      disabled={disabled}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FlatView 옵션 (트래킹 모드 영상) */}
      {item.type === 'video' && item.mode === 'tracking' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`flatview-${item.id}`}
            checked={item.flatView}
            onChange={() => onChange({ flatView: !item.flatView })}
            disabled={disabled}
            className="rounded border-gray-300"
          />
          <label
            htmlFor={`flatview-${item.id}`}
            className="text-xs font-medium text-gray-600"
          >
            정면 고정 (FlatView)
          </label>
        </div>
      )}

      {/* 링크 설정 (이미지에서만) */}
      {item.type === 'image' && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id={`link-${item.id}`}
              checked={item.linkEnabled}
              onChange={handleLinkToggle}
              disabled={disabled}
              className="rounded border-gray-300"
            />
            <label
              htmlFor={`link-${item.id}`}
              className="text-xs font-medium text-gray-600"
            >
              링크 삽입
            </label>
          </div>
          {item.linkEnabled && (
            <input
              type="url"
              value={item.linkUrl || ''}
              onChange={(e) => handleLinkUrlChange(e.target.value)}
              disabled={disabled}
              placeholder="https://example.com"
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          )}
        </div>
      )}

      {/* 순서 변경 버튼 */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMoveUp}
          disabled={disabled || !canMoveUp}
          className="flex-1 gap-1 text-gray-700 border-gray-300"
        >
          <ArrowUp size={14} />
          위로
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMoveDown}
          disabled={disabled || !canMoveDown}
          className="flex-1 gap-1 text-gray-700 border-gray-300"
        >
          <ArrowDown size={14} />
          아래로
        </Button>
      </div>
    </div>
  )
}
