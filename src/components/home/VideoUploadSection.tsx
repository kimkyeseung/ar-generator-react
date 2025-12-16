import { FileUpload } from '../FileUpload'
import StatusCallout from './StatusCallout'
import VideoLimitNotice from './VideoLimitNotice'

type VideoUploadSectionProps = {
  isTargetReady: boolean
  videoFile: File | null
  onFileSelect: (file: File | File[] | null) => void
  limitMb: number
  videoError: string | null
  mediaWidth: number
  mediaHeight: number
  onWidthChange: (width: number) => void
  onHeightChange: (height: number) => void
}

export default function VideoUploadSection({
  isTargetReady,
  videoFile,
  onFileSelect,
  limitMb,
  videoError,
  mediaWidth,
  mediaHeight,
  onWidthChange,
  onHeightChange,
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

      <div className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
        <p className='mb-3 text-sm font-medium text-slate-700'>
          미디어 크기 (AR 재생 시 적용)
        </p>
        <div className='flex items-center gap-3'>
          <div className='flex flex-1 items-center gap-2'>
            <label htmlFor='media-width' className='text-sm text-slate-600'>
              Width
            </label>
            <input
              id='media-width'
              type='number'
              min={0.1}
              step={0.1}
              value={mediaWidth}
              onChange={(e) => onWidthChange(parseFloat(e.target.value) || 1)}
              className='w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
            />
          </div>
          <span className='text-slate-400'>×</span>
          <div className='flex flex-1 items-center gap-2'>
            <label htmlFor='media-height' className='text-sm text-slate-600'>
              Height
            </label>
            <input
              id='media-height'
              type='number'
              min={0.1}
              step={0.1}
              value={mediaHeight}
              onChange={(e) => onHeightChange(parseFloat(e.target.value) || 1)}
              className='w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
            />
          </div>
        </div>
        <p className='mt-2 text-xs text-slate-500'>
          기본값: 1 × 1 (A-Frame 단위)
        </p>
      </div>

      {videoError && <StatusCallout message={videoError} variant='error' />}
    </div>
  )
}
