import { CameraResolution } from '../../types/project'

interface CameraResolutionSelectorProps {
  resolution: CameraResolution
  onResolutionChange: (resolution: CameraResolution) => void
  disabled?: boolean
}

const resolutionOptions: {
  value: CameraResolution
  label: string
  description: string
  specs: string
}[] = [
  {
    value: '4k',
    label: '4K UHD',
    description: '최고 화질 (배터리 소모 높음)',
    specs: '4096x2160',
  },
  {
    value: 'qhd',
    label: 'QHD (2K)',
    description: '고화질',
    specs: '2560x1440',
  },
  {
    value: 'fhd',
    label: 'Full HD',
    description: '권장 설정',
    specs: '1920x1080',
  },
  {
    value: 'hd',
    label: 'HD',
    description: '배터리 절약 모드',
    specs: '1280x720',
  },
]

export default function CameraResolutionSelector({
  resolution,
  onResolutionChange,
  disabled = false,
}: CameraResolutionSelectorProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">카메라 화질</h3>
      <div className="grid grid-cols-4 gap-2">
        {resolutionOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onResolutionChange(option.value)}
            disabled={disabled}
            className={`relative flex flex-col items-center rounded-lg border-2 p-3 transition-all ${
              resolution === option.value
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <div className="text-xs font-medium text-gray-800">{option.label}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{option.specs}</div>
            {resolution === option.value && (
              <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500">
                <svg
                  className="h-2.5 w-2.5 text-white"
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
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {resolutionOptions.find((o) => o.value === resolution)?.description}
      </p>
    </div>
  )
}
