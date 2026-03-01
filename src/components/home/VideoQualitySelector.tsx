import { FC } from 'react'
import { VideoQuality } from '../../types/project'

interface Props {
  quality: VideoQuality
  onQualityChange: (quality: VideoQuality) => void
  disabled?: boolean
}

const qualityOptions: { value: VideoQuality; label: string; description: string }[] = [
  {
    value: 'high',
    label: '고화질',
    description: '원본 그대로 (압축 없음)',
  },
  {
    value: 'medium',
    label: '중간화질',
    description: '720p, 빠른 로딩',
  },
  {
    value: 'low',
    label: '저화질',
    description: '480p, 가장 빠른 로딩',
  },
]

const VideoQualitySelector: FC<Props> = ({
  quality,
  onQualityChange,
  disabled = false,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        영상 품질
      </label>
      <div className="grid grid-cols-3 gap-2">
        {qualityOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onQualityChange(option.value)}
            disabled={disabled}
            className={`
              relative px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all
              ${
                quality === option.value
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-pressed={quality === option.value}
            aria-label={`${option.label} 선택`}
          >
            <div className="font-semibold">{option.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {quality === 'high' && '원본 영상을 그대로 사용합니다. 용량이 크면 로딩이 느릴 수 있습니다.'}
        {quality === 'medium' && '720p로 압축하여 적당한 품질과 로딩 속도를 제공합니다.'}
        {quality === 'low' && '480p로 압축하여 가장 빠르게 로딩됩니다. 화질이 낮을 수 있습니다.'}
      </p>
    </div>
  )
}

export default VideoQualitySelector
