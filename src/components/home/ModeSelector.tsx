import { ProjectMode } from '../../types/project'

interface ModeSelectorProps {
  mode: ProjectMode
  onModeChange: (mode: ProjectMode) => void
  disabled?: boolean
}

export default function ModeSelector({
  mode,
  onModeChange,
  disabled = false,
}: ModeSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">모드 선택</h3>
      <div className="grid grid-cols-2 gap-3">
        {/* AR 모드 */}
        <button
          type="button"
          onClick={() => onModeChange('ar')}
          disabled={disabled}
          className={`relative flex flex-col items-center rounded-xl border-2 p-4 transition-all ${
            mode === 'ar'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          aria-pressed={mode === 'ar'}
          aria-label="AR 모드 선택"
        >
          <div className="mb-2 text-3xl">🎯</div>
          <div className="text-sm font-medium text-gray-800">AR 모드</div>
          <p className="mt-1 text-xs text-gray-500 text-center">
            타겟 이미지를 인식하면
            <br />
            영상이 재생됩니다
          </p>
          {mode === 'ar' && (
            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500">
              <svg
                className="h-3 w-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </button>

        {/* 기본 모드 */}
        <button
          type="button"
          onClick={() => onModeChange('basic')}
          disabled={disabled}
          className={`relative flex flex-col items-center rounded-xl border-2 p-4 transition-all ${
            mode === 'basic'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          aria-pressed={mode === 'basic'}
          aria-label="기본 모드 선택"
        >
          <div className="mb-2 text-3xl">📹</div>
          <div className="text-sm font-medium text-gray-800">기본 모드</div>
          <p className="mt-1 text-xs text-gray-500 text-center">
            카메라 화면에 바로
            <br />
            영상이 표시됩니다
          </p>
          {mode === 'basic' && (
            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500">
              <svg
                className="h-3 w-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
