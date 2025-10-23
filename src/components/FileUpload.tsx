import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Upload, X, FileImage, Video } from 'lucide-react'

interface FileUploadProps {
  accept: string
  label: string
  icon: 'image' | 'video'
  onFileSelect: (file: File | File[] | null) => void
  file: File | File[] | null
  isMultiple?: boolean
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
    [file],
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
    [files, isMultiple, onFileSelect],
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
    [files, isMultiple, onFileSelect],
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
    [files, isMultiple, onFileSelect],
  )

  const Icon = icon === 'image' ? FileImage : Video

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-700">{label}</label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : files.length > 0
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          multiple={isMultiple}
          ref={inputRef}
          className="hidden"
        />

        {files.length > 0 ? (
          <div className="flex flex-col gap-3">
            {files.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg bg-white/80 p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="text-gray-900 text-sm font-medium">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(item.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemove(item.name)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload className="w-10 h-10 text-gray-400" />
            <div>
              <p className="text-gray-700">
                드래그 앤 드롭 또는 클릭하여 파일 선택
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {accept.includes('image') ? '이미지 파일' : '비디오 파일'}만
                가능합니다
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
