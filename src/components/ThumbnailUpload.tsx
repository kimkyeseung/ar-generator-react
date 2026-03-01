import React, { useCallback, useRef, useState } from 'react'

interface ThumbnailUploadProps {
  base64: string | null
  existingThumbnailBase64?: string // 기존 썸네일 Base64 (편집 시)
  onBase64Change: (base64: string | null) => void
  disabled?: boolean
}

export default function ThumbnailUpload({
  base64,
  existingThumbnailBase64,
  onBase64Change,
  disabled = false,
}: ThumbnailUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  // 기존 썸네일을 숨길지 여부 (삭제 버튼 클릭 시)
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
        setError('썸네일 이미지는 5MB 이하만 가능합니다.')
        return
      }

      setError(null)

      // 이미지 크기 확인 및 정사각형 체크
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(img.src)

        // 정사각형 권장 (허용은 하지만 경고)
        if (Math.abs(img.width - img.height) > 10) {
          console.warn(`[Thumbnail] 정사각형 권장: 현재 ${img.width}x${img.height}`)
        }

        // Base64로 변환
        const reader = new FileReader()
        reader.onload = () => {
          const base64Result = reader.result as string
          setHideExisting(false) // 새 파일 업로드 시 상태 리셋
          onBase64Change(base64Result)
        }
        reader.onerror = () => {
          setError('이미지를 읽을 수 없습니다.')
        }
        reader.readAsDataURL(selectedFile)
      }
      img.onerror = () => {
        setError('이미지를 불러올 수 없습니다.')
      }
      img.src = URL.createObjectURL(selectedFile)
    },
    [onBase64Change]
  )

  const handleRemove = useCallback(() => {
    setError(null)
    setHideExisting(true) // 기존 썸네일도 숨김
    onBase64Change(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onBase64Change])

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  // 표시할 이미지 (새 base64 우선, 기존 썸네일 숨김이면 null)
  const displayUrl = base64 || (hideExisting ? null : existingThumbnailBase64) || null

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        썸네일 이미지 (선택)
      </label>
      <p className="text-xs text-gray-500 mb-2">
        정사각형 이미지 권장. 미설정 시 영상의 첫 화면이 썸네일로 사용됩니다.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        data-testid="thumbnail-input"
      />

      {displayUrl ? (
        <div className="relative inline-block group">
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-purple-400 transition-colors disabled:cursor-not-allowed"
          >
            <img
              src={displayUrl}
              alt="썸네일 미리보기"
              className="w-full h-full object-cover"
            />
            {/* 호버 시 변경 아이콘 표시 */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
            aria-label="썸네일 삭제"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className="w-8 h-8 mb-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs">업로드</span>
        </button>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
