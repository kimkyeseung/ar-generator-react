/**
 * 안내문구 이미지 오버레이
 * 모든 영상이 로드되기 전까지 표시됨
 */

interface GuideImageOverlayProps {
  imageUrl: string
}

export function GuideImageOverlay({ imageUrl }: GuideImageOverlayProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
      <img
        src={imageUrl}
        alt="안내문구"
        className="w-full h-full object-cover animate-pulse"
      />
    </div>
  )
}
