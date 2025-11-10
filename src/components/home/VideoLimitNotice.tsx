import { AlertCircle } from 'lucide-react'

type VideoLimitNoticeProps = {
  limitMb: number
}

export default function VideoLimitNotice({ limitMb }: VideoLimitNoticeProps) {
  return (
    <p className='flex items-center gap-2 text-xs text-gray-600'>
      <AlertCircle className='h-4 w-4 text-amber-500' />
      비디오 파일은 {limitMb}MB 이하의 MP4, WebM, MOV 형식을 권장합니다.
    </p>
  )
}
