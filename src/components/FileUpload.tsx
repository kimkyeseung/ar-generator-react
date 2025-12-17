import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Upload, X, FileImage, Video, Play } from 'lucide-react'

interface FileUploadProps {
  accept: string
  label: string
  icon: 'image' | 'video'
  onFileSelect: (file: File | File[] | null) => void
  file: File | File[] | null
  isMultiple?: boolean
}

// 파일 미리보기 URL을 생성하는 훅
function useFilePreview(file: File | null) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  return preview
}

// 파일 아이템 컴포넌트 (미리보기 포함)
function FileItem({
  file,
  type,
  onRemove,
}: {
  file: File
  type: 'image' | 'video'
  onRemove: (e: React.MouseEvent) => void
}) {
  const preview = useFilePreview(file)
  const Icon = type === 'image' ? FileImage : Video

  return (
    <div className='flex items-center gap-4 rounded-lg bg-white/80 p-3 shadow-sm'>
      {/* 미리보기 썸네일 */}
      <div className='relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100'>
        {preview ? (
          type === 'image' ? (
            <img
              src={preview}
              alt={file.name}
              className='h-full w-full object-cover'
            />
          ) : (
            <div className='relative h-full w-full'>
              <video
                src={preview}
                className='h-full w-full object-cover'
                muted
                preload='metadata'
                onLoadedMetadata={(e) => {
                  // 영상 첫 프레임으로 이동
                  const video = e.target as HTMLVideoElement
                  video.currentTime = 0.1
                }}
              />
              <div className='absolute inset-0 flex items-center justify-center bg-black/20'>
                <Play className='h-6 w-6 text-white' fill='white' />
              </div>
            </div>
          )
        ) : (
          <div className='flex h-full w-full items-center justify-center'>
            <Icon className='h-8 w-8 text-gray-400' />
          </div>
        )}
      </div>

      {/* 파일 정보 */}
      <div className='flex-1 min-w-0'>
        <p className='truncate text-sm font-medium text-gray-900'>
          {file.name}
        </p>
        <p className='text-xs text-gray-500'>
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={onRemove}
        className='flex-shrink-0 rounded-full p-2 transition-colors hover:bg-gray-100'
      >
        <X className='h-4 w-4 text-gray-600' />
      </button>
    </div>
  )
}

export function FileUpload({
  accept,
  label,
  icon,
  onFileSelect,
  file,
  isMultiple = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const files = useMemo(
    () => (Array.isArray(file) ? file : file ? [file] : []),
    [file]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length === 0) return

      if (isMultiple) {
        const existingNames = new Set(files.map((f) => f.name))
        const merged = [
          ...files,
          ...droppedFiles.filter((f) => !existingNames.has(f.name)),
        ]
        onFileSelect(merged)
      } else {
        onFileSelect(droppedFiles[0])
      }
    },
    [files, isMultiple, onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || [])
      if (selectedFiles.length === 0) return

      if (isMultiple) {
        const existingNames = new Set(files.map((f) => f.name))
        const merged = [
          ...files,
          ...selectedFiles.filter((f) => !existingNames.has(f.name)),
        ]
        onFileSelect(merged)
      } else {
        onFileSelect(selectedFiles[0])
      }
    },
    [files, isMultiple, onFileSelect]
  )

  const handleRemove = useCallback(
    (fileName: string) => (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isMultiple) {
        const filtered = files.filter((f) => f.name !== fileName)
        onFileSelect(filtered.length ? filtered : [])
      } else {
        onFileSelect([])
      }
    },
    [files, isMultiple, onFileSelect]
  )

  return (
    <div className='space-y-2'>
      <label className='block text-sm font-medium text-gray-700'>{label}</label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
            : files.length > 0
              ? 'border-emerald-400 bg-emerald-50/50'
              : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-gray-100'
        }`}
      >
        <input
          type='file'
          accept={accept}
          onChange={handleFileInput}
          multiple={isMultiple}
          ref={inputRef}
          className='hidden'
        />

        {files.length > 0 ? (
          <div className='flex flex-col gap-3'>
            {files.map((item) => (
              <FileItem
                key={item.name}
                file={item}
                type={icon}
                onRemove={handleRemove(item.name)}
              />
            ))}
            {/* 추가 파일 업로드 힌트 */}
            {isMultiple && (
              <p className='text-center text-xs text-gray-400'>
                클릭하여 파일 추가
              </p>
            )}
          </div>
        ) : (
          <div className='flex flex-col items-center gap-3 py-4 text-center'>
            <div className={`rounded-full p-4 ${isDragging ? 'bg-indigo-100' : 'bg-gray-100'}`}>
              <Upload className={`h-8 w-8 ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className='font-medium text-gray-700'>
                드래그 앤 드롭 또는 클릭하여 파일 선택
              </p>
              <p className='mt-1 text-sm text-gray-500'>
                {accept.includes('image') ? '이미지 파일 (JPG, PNG, WebP)' : '비디오 파일 (MP4, WebM)'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
