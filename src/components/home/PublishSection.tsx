import { Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import StatusCallout from './StatusCallout'

type PublishSectionProps = {
  canPublish: boolean
  onPublish: () => void
  progress: number
  isUploading: boolean
  isCompiling: boolean
  isCompressing?: boolean
  compressionProgress?: number
  uploadError: string | null
}

export default function PublishSection({
  canPublish,
  onPublish,
  progress,
  isUploading,
  isCompiling,
  isCompressing = false,
  compressionProgress = 0,
  uploadError,
}: PublishSectionProps) {
  const isDisabled = !canPublish || isUploading || isCompiling || isCompressing
  const buttonLabel = isUploading
    ? '업로드 중...'
    : isCompressing
      ? '영상 압축 완료 후 진행'
      : isCompiling
        ? '타겟 변환 완료 후 진행'
        : 'Publish'

  return (
    <div className='space-y-4 pt-2'>
      <Button
        onClick={onPublish}
        disabled={isDisabled}
        className='w-full'
        size='lg'
      >
        <Sparkles className='mr-2 h-5 w-5' />
        {buttonLabel}
      </Button>

      {isCompiling && (
        <StatusCallout message='타겟 이미지를 .mind 파일로 변환 중입니다. 완료되면 자동으로 버튼이 활성화됩니다.' />
      )}

      {isCompressing && (
        <div className='space-y-1'>
          <StatusCallout message='빠른 로딩을 위해 영상을 압축하고 있습니다...' />
          <div className='flex items-center justify-between text-xs text-gray-500'>
            <span>압축 진행률</span>
            <span>{compressionProgress}%</span>
          </div>
          <Progress value={compressionProgress} />
        </div>
      )}

      {isUploading && (
        <div className='space-y-2'>
          <StatusCallout message='AR이 생성되기전까지 잠시만 기다려주세요!' />
          <p className='text-xs text-gray-500 text-center'>
            (데이터에 따라 속도가 지연될 수 있습니다)
          </p>
        </div>
      )}

      {progress > 0 && (
        <div className='space-y-1'>
          <div className='flex items-center justify-between text-xs text-gray-500'>
            <span>업로드 진행률</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {uploadError && <StatusCallout message={uploadError} variant='error' />}
    </div>
  )
}
