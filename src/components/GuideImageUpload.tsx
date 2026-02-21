import React, { useRef, useCallback } from 'react'
import { Upload, X, Info } from 'lucide-react'
import { Button } from './ui/button'

interface GuideImageUploadProps {
  file: File | null
  existingImageUrl?: string
  onFileSelect: (file: File | null) => void
  disabled?: boolean
}

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const RECOMMENDED_WIDTH = 1080
const RECOMMENDED_HEIGHT = 1920

export default function GuideImageUpload({
  file,
  existingImageUrl,
  onFileSelect,
  disabled = false,
}: GuideImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(null)
  const [hideExisting, setHideExisting] = React.useState(false)

  // 파일 변경 시 프리뷰 URL 생성
  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [file])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null)
      setDimensions(null)

      const selectedFile = e.target.files?.[0]
      if (!selectedFile) {
        onFileSelect(null)
        return
      }

      // 파일 크기 검사
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setError(`파일 크기는 ${MAX_FILE_SIZE_MB}MB 이하여야 합니다.`)
        onFileSelect(null)
        return
      }

      // 이미지 타입 검사
      if (!selectedFile.type.startsWith('image/')) {
        setError('이미지 파일만 업로드할 수 있습니다.')
        onFileSelect(null)
        return
      }

      // 이미지 크기 검사
      const img = new window.Image()
      img.onload = () => {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight })

        // 권장 크기와 다르면 경고 (에러는 아님)
        if (img.naturalWidth !== RECOMMENDED_WIDTH || img.naturalHeight !== RECOMMENDED_HEIGHT) {
          console.log(
            `Guide image size: ${img.naturalWidth}x${img.naturalHeight} (recommended: ${RECOMMENDED_WIDTH}x${RECOMMENDED_HEIGHT})`
          )
        }

        setHideExisting(false)
        onFileSelect(selectedFile)
        URL.revokeObjectURL(img.src)
      }
      img.onerror = () => {
        setError('이미지를 로드할 수 없습니다.')
        onFileSelect(null)
      }
      img.src = URL.createObjectURL(selectedFile)

      // 입력 필드 초기화
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [onFileSelect]
  )

  const handleRemove = () => {
    onFileSelect(null)
    setDimensions(null)
    setError(null)
    setHideExisting(true)
  }

  const displayUrl = previewUrl || (hideExisting ? null : existingImageUrl)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-700">
          영상 뜨기 전까지 안내문구 이미지 업로드 (선택)
        </label>
        <div className="relative group">
          <Info size={14} className="text-gray-400" />
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
            AR 뷰어 진입 시 표시되는 안내문구 이미지입니다.
            <br />
            권장 크기: {RECOMMENDED_WIDTH}x{RECOMMENDED_HEIGHT}px
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {displayUrl ? (
        <div className="relative inline-block group">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="relative rounded-lg overflow-hidden border border-gray-200 hover:border-purple-400 transition-colors disabled:cursor-not-allowed"
          >
            <img
              src={displayUrl}
              alt="안내문구 이미지 미리보기"
              className="max-w-[200px] max-h-[355px] object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload size={24} className="text-white" />
            </div>
          </button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-2 right-2 h-6 w-6"
          >
            <X size={14} />
          </Button>
          {dimensions && (
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {dimensions.width}x{dimensions.height}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={24} className="text-gray-400" />
          <span className="text-sm text-gray-500">
            클릭하여 안내문구 이미지 업로드
          </span>
          <span className="text-xs text-gray-400">
            권장: {RECOMMENDED_WIDTH}x{RECOMMENDED_HEIGHT}px
          </span>
        </button>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
