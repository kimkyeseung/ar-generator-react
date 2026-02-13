import React, { useCallback, useRef, useState } from 'react'

interface OverlayImageUploadProps {
  file: File | null
  linkUrl: string
  existingImageUrl?: string // 기존 이미지 URL (편집 시)
  onFileSelect: (file: File | null) => void
  onLinkUrlChange: (url: string) => void
  disabled?: boolean
}

export default function OverlayImageUpload({
  file,
  linkUrl,
  existingImageUrl,
  onFileSelect,
  onLinkUrlChange,
  disabled = false,
}: OverlayImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [hideExisting, setHideExisting] = useState(false)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (!selectedFile) return

      // 이미지 파일인지 확인
      if (!selectedFile.type.startsWith('image/')) {
        setError('이미지 파일만 업로드할 수 있습니다.')
        return
      }

      // 파일 크기 제한 (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('이미지는 5MB 이하만 가능합니다.')
        return
      }

      setError(null)

      // 프리뷰 URL 생성
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
      setHideExisting(false)
      onFileSelect(selectedFile)
    },
    [onFileSelect]
  )

  const handleRemove = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setError(null)
    setHideExisting(true)
    onFileSelect(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [previewUrl, onFileSelect])

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  const handleLinkChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      onLinkUrlChange(value)

      // URL 유효성 검사 (비어있거나 유효한 URL)
      if (value && !isValidUrl(value)) {
        setLinkError('유효한 URL을 입력하세요 (예: https://example.com)')
      } else {
        setLinkError(null)
      }
    },
    [onLinkUrlChange]
  )

  // 표시할 이미지 URL (기존 이미지가 숨겨진 경우 표시하지 않음)
  const displayUrl = previewUrl || (file ? URL.createObjectURL(file) : null) || (hideExisting ? null : existingImageUrl)

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        오버레이 이미지 (선택)
      </label>
      <p className="text-xs text-gray-500">
        화면에 표시될 이미지를 추가하고, 클릭 시 열릴 링크를 설정할 수 있습니다.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        data-testid="overlay-image-input"
      />

      <div className="flex items-start gap-4">
        {/* 이미지 업로드 영역 */}
        {displayUrl ? (
          <div className="relative flex-shrink-0 group">
            <button
              type="button"
              onClick={handleClick}
              disabled={disabled}
              className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50 hover:border-purple-400 transition-colors disabled:cursor-not-allowed"
            >
              <img
                src={displayUrl}
                alt="오버레이 이미지 미리보기"
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
              aria-label="이미지 삭제"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="w-20 h-20 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span className="text-xs">이미지</span>
          </button>
        )}

        {/* 링크 URL 입력 */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            클릭 시 열릴 링크 (선택)
          </label>
          <input
            type="url"
            value={linkUrl}
            onChange={handleLinkChange}
            placeholder="https://example.com"
            disabled={disabled}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          />
          {linkError && (
            <p className="text-xs text-red-500 mt-1">{linkError}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            이미지 클릭 시 새 창에서 링크가 열립니다.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

// URL 유효성 검사
function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}
