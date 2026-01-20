import { FC } from 'react'
import { FileUpload } from './FileUpload'

interface Props {
  files: File[]
  onFileSelect: (files: File[]) => void
}

const TargetImageUpload: FC<Props> = ({ files, onFileSelect }) => {
  const handleFileSelect = (input: File | File[] | null) => {
    if (!input) {
      onFileSelect([])
      return
    }
    if (Array.isArray(input)) {
      onFileSelect(input)
    } else {
      onFileSelect([input])
    }
  }

  return (
    <FileUpload
      accept='image/*'
      label='Target Image'
      icon='image'
      isMultiple
      onFileSelect={handleFileSelect}
      file={files}
    />
  )
}

export default TargetImageUpload
