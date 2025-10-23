'use client'

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'

interface Props {
  value: File[] // react-hook-form으로부터 받을 파일 목록
  onChange: (files: File[]) => void // 파일 목록 변경 시 호출할 함수
  errorMessage?: string // 유효성 검사 에러 메시지
}

export default function Dropzone({ value, onChange, errorMessage }: Props) {
  // 드래그 중인지 상태를 관리합니다.
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // 숨겨진 file input 요소에 접근하기 위한 ref입니다.
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (newFiles: File[]) => {
    const existingFileNames = new Set(value.map((file) => file.name))
    const filteredNewFiles = newFiles.filter(
      (file) => !existingFileNames.has(file.name),
    )
    // 변경된 전체 파일 목록을 onChange를 통해 부모 컴포넌트로 전달
    onChange([...value, ...filteredNewFiles])
  }

  const removeFile = (fileName: string) => {
    const newFiles = value.filter((file) => file.name !== fileName)
    onChange(newFiles)
  }

  // 드래그 이벤트 핸들러들
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault() // 브라우저 기본 동작 방지
    e.stopPropagation() // 이벤트 전파 중단
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    // 드롭을 허용하기 위해 preventDefault가 필요합니다.
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles)
    }
  }

  // 파일 선택창에서 파일이 선택되었을 때 호출됩니다.
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      handleFiles(selectedFiles)
    }
  }

  // Dropzone 클릭 시 파일 선택창을 엽니다.
  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center justify-center">
      <div
        className={`
          flex w-full cursor-pointer flex-col items-center justify-center 
          rounded-lg border-2 border-dashed p-10 text-center transition-colors
          ${
            isDragging
              ? 'border-blue-500 bg-blue-100'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
      >
        {/* 실제 파일 입력은 숨겨져 있습니다. */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          multiple // 여러 파일 선택을 허용합니다.
        />
        <p className="text-gray-500">
          이곳에 파일을 드래그하거나 클릭하여 선택하세요.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
      )}
      {/* 파일 목록 표시 (value prop 사용) */}
      {value.length > 0 && (
        <div className="mt-4 w-full">
          <ul className="space-y-2">
            {value.map((file) => (
              <li
                key={file.name}
                className="flex items-center justify-between rounded-md bg-gray-100 p-2 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(file.name)}
                  className="ml-2 rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                  aria-label={`${file.name} 파일 삭제`}
                >
                  &#x2715; {/* X 기호 */}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
