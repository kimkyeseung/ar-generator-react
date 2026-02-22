/**
 * 기본 모드 미디어 아이템
 * AR 트래킹 없이 화면에 고정되어 표시되는 미디어 (이미지/비디오)
 */

import { ProcessedMediaItem } from '../../MindARViewerPage'
import ChromaKeyVideo from '../ChromaKeyVideo'
import { normalizeUrl } from '../../utils/validation'

interface BasicModeMediaItemProps {
  item: ProcessedMediaItem
  onVideoLoaded: () => void
}

export function BasicModeMediaItem({ item, onVideoLoaded }: BasicModeMediaItemProps) {
  // scale=1(100%)일 때 화면에 맞춤: 세로 미디어는 width 100%, 가로 미디어는 height 100%
  // 미리보기(UnifiedPreviewCanvas) 및 BasicModeViewer와 동일한 로직
  const sizeStyle = item.aspectRatio < 1
    ? { width: '100%', aspectRatio: `${item.aspectRatio}` }
    : { height: '100%', aspectRatio: `${item.aspectRatio}` }

  const containerStyle = {
    left: `${item.position.x * 100}%`,
    top: `${item.position.y * 100}%`,
    transform: `translate(-50%, -50%) scale(${item.scale})`,
    ...sizeStyle,
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

  const normalizedLinkUrl = normalizeUrl(item.linkUrl)
  if (item.linkEnabled && normalizedLinkUrl) {
    return (
      <a
        href={normalizedLinkUrl}
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
