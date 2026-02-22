/**
 * 오버레이 이미지 버튼
 * 화면 우하단에 표시되며, 클릭 시 링크 열기 가능
 */

interface OverlayImageButtonProps {
  imageUrl: string
  linkUrl?: string
  onClick: () => void
}

export function OverlayImageButton({ imageUrl, linkUrl, onClick }: OverlayImageButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 rounded-xl overflow-hidden shadow-lg transition-transform active:scale-95 hover:scale-105"
      style={{ cursor: linkUrl ? 'pointer' : 'default' }}
      aria-label={linkUrl ? '링크 열기' : '오버레이 이미지'}
    >
      <img
        src={imageUrl}
        alt="오버레이 이미지"
        className="w-16 h-16 object-contain bg-white/90 backdrop-blur-sm"
      />
      {linkUrl && <LinkIndicator />}
    </button>
  )
}

// 링크 아이콘 오버레이
function LinkIndicator() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
      <svg
        className="w-6 h-6 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </div>
  )
}
