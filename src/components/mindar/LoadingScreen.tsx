/**
 * AR 뷰어 로딩 화면
 */

interface LoadingScreenProps {
  targetImageUrl: string
}

export function LoadingScreen({ targetImageUrl }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
      <div className="mb-6">
        <img
          src={targetImageUrl}
          alt="타겟 이미지"
          className="h-40 w-40 rounded-xl border-4 border-white/30 object-cover shadow-2xl"
        />
      </div>
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      <p className="text-lg font-medium text-white">AR 준비 중...</p>
      <p className="mt-2 text-sm text-white/70">카메라 권한을 허용해주세요</p>
    </div>
  )
}
