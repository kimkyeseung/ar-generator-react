/**
 * 기본 모드 미디어 아이템
 * AR 트래킹 없이 화면에 고정되어 표시되는 미디어 (이미지/비디오)
 */

import { ProcessedMediaItem } from '../../MindARViewerPage'
import ChromaKeyVideo from '../ChromaKeyVideo'

interface BasicModeMediaItemProps {
  item: ProcessedMediaItem
  onVideoLoaded: () => void
}

export function BasicModeMediaItem({ item, onVideoLoaded }: BasicModeMediaItemProps) {
  const containerStyle = {
    left: `${item.position.x * 100}%`,
    top: `${item.position.y * 100}%`,
    transform: `translate(-50%, -50%) scale(${item.scale})`,
    width: item.aspectRatio >= 1 ? '50vw' : `${50 * item.aspectRatio}vw`,
    aspectRatio: `${item.aspectRatio}`,
    zIndex: 30 + item.order,
  }

  return (
    <div className="fixed" style={containerStyle}>
      {item.type === 'image' ? (
        <ImageContent item={item} />
      ) : (
        <VideoContent item={item} onLoaded={onVideoLoaded} />
      )}
    </div>
  )
}

// 이미지 콘텐츠
function ImageContent({ item }: { item: ProcessedMediaItem }) {
  const imageElement = (
    <img
      src={item.fileUrl}
      alt={`Media item ${item.order}`}
      className="w-full h-full object-contain"
    />
  )

  if (item.linkEnabled && item.linkUrl) {
    return (
      <a
        href={item.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full"
      >
        {imageElement}
      </a>
    )
  }

  return <div className="pointer-events-none">{imageElement}</div>
}

// 비디오 콘텐츠
function VideoContent({
  item,
  onLoaded,
}: {
  item: ProcessedMediaItem
  onLoaded: () => void
}) {
  const videoSrc = item.previewFileUrl || item.fileUrl

  if (item.chromaKeyEnabled) {
    return (
      <ChromaKeyVideo
        src={videoSrc}
        chromaKeyColor={item.chromaKeyColor || '#00FF00'}
        chromaKeySettings={item.chromaKeySettings}
        className="w-full h-full object-contain pointer-events-none"
        onLoadedData={onLoaded}
      />
    )
  }

  return (
    <video
      src={videoSrc}
      loop
      muted
      playsInline
      autoPlay
      crossOrigin="anonymous"
      className="w-full h-full object-contain pointer-events-none"
      onLoadedData={onLoaded}
    />
  )
}
