import { FileUpload } from '../FileUpload'
import StatusCallout from './StatusCallout'
import VideoLimitNotice from './VideoLimitNotice'

type VideoUploadSectionProps = {
  isTargetReady: boolean
  videoFile: File | null
  onFileSelect: (file: File | File[] | null) => void
  limitMb: number
  videoError: string | null
}

export default function VideoUploadSection({
  isTargetReady,
  videoFile,
  onFileSelect,
  limitMb,
  videoError,
}: VideoUploadSectionProps) {
  if (!isTargetReady) {
    return (
      <StatusCallout message='타겟 이미지를 업로드해 .mind 파일을 생성하면 비디오를 연결할 수 있습니다.' />
    )
  }

  return (
    <div className='space-y-4'>
      <FileUpload
        accept='video/*'
        label='Video Content'
        icon='video'
        onFileSelect={onFileSelect}
        file={videoFile}
      />
      <VideoLimitNotice limitMb={limitMb} />
      {videoError && <StatusCallout message={videoError} variant='error' />}
    </div>
  )
}
