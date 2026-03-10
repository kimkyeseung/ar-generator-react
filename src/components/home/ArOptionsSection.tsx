import { useState } from 'react'
import {
  StabilizationSettings,
  DEFAULT_STABILIZATION_SETTINGS,
  RECOMMENDED_STABILIZATION_SETTINGS,
} from '../../types/project'

type ArOptionsSectionProps = {
  highPrecision: boolean
  onHighPrecisionChange: (value: boolean) => void
  stabilization: StabilizationSettings
  onStabilizationChange: (updates: Partial<StabilizationSettings>) => void
}

export default function ArOptionsSection({
  highPrecision,
  onHighPrecisionChange,
  stabilization,
  onStabilizationChange,
}: ArOptionsSectionProps) {
  const [showStabilization, setShowStabilization] = useState(false)

  const isDefault =
    stabilization.filterMinCF === DEFAULT_STABILIZATION_SETTINGS.filterMinCF &&
    stabilization.filterBeta === DEFAULT_STABILIZATION_SETTINGS.filterBeta &&
    stabilization.missTolerance === DEFAULT_STABILIZATION_SETTINGS.missTolerance &&
    stabilization.matrixLerpFactor === DEFAULT_STABILIZATION_SETTINGS.matrixLerpFactor

  const isRecommended =
    stabilization.filterMinCF === RECOMMENDED_STABILIZATION_SETTINGS.filterMinCF &&
    stabilization.filterBeta === RECOMMENDED_STABILIZATION_SETTINGS.filterBeta &&
    stabilization.missTolerance === RECOMMENDED_STABILIZATION_SETTINGS.missTolerance &&
    stabilization.matrixLerpFactor === RECOMMENDED_STABILIZATION_SETTINGS.matrixLerpFactor

  return (
    <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4'>
      <h3 className='text-sm font-semibold text-gray-700'>AR 설정</h3>

      {/* 추적 정확도 향상 옵션 */}
      <div className='flex items-start gap-3'>
        <input
          type='checkbox'
          id='high-precision'
          checked={highPrecision}
          onChange={(e) => onHighPrecisionChange(e.target.checked)}
          className='h-4 w-4 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500'
        />
        <div>
          <label htmlFor='high-precision' className='text-sm font-medium text-gray-700'>
            추적 정확도 향상
          </label>
          <p className='text-xs text-gray-500 mt-1'>
            더 정밀한 추적과 부드러운 AR 표시를 위해 최적화된 설정을 적용합니다.
            컴파일 시 더 많은 특징점을 추출하고, 런타임에서 추적 감도를 높입니다.
          </p>
        </div>
      </div>

      {/* 트래킹 안정화 고급 설정 */}
      <div className='border-t border-gray-200 pt-3'>
        <button
          type='button'
          onClick={() => setShowStabilization(!showStabilization)}
          className='flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800'
        >
          <span className={`transition-transform ${showStabilization ? 'rotate-90' : ''}`}>▶</span>
          트래킹 안정화 설정
          {!isDefault && (
            <span className='text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700'>커스텀</span>
          )}
        </button>

        {showStabilization && (
          <div className='mt-3 space-y-4'>
            {/* 프리셋 버튼 */}
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => onStabilizationChange(DEFAULT_STABILIZATION_SETTINGS)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  isDefault
                    ? 'bg-gray-700 text-white border-gray-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
              >
                기본값 (원본)
              </button>
              <button
                type='button'
                onClick={() => onStabilizationChange(RECOMMENDED_STABILIZATION_SETTINGS)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  isRecommended
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-purple-600 border-purple-300 hover:bg-purple-50'
                }`}
              >
                권장값 (떨림 최소화)
              </button>
            </div>

            {/* filterBeta */}
            <StabilizationSlider
              label='속도 반응도 (filterBeta)'
              value={stabilization.filterBeta}
              min={0}
              max={200}
              step={1}
              recommendedValue={RECOMMENDED_STABILIZATION_SETTINGS.filterBeta}
              defaultValue={DEFAULT_STABILIZATION_SETTINGS.filterBeta}
              onChange={(v) => onStabilizationChange({ filterBeta: v })}
              descriptions={[
                { label: '낮을 때 (0~10)', text: '카메라를 빠르게 움직여도 스무딩이 유지되어 떨림이 적습니다. 대신 움직임에 느리게 반응하여 오버레이가 "뒤따라오는" 느낌이 날 수 있습니다.', color: 'text-blue-600' },
                { label: '높을 때 (50~200)', text: '작은 움직임에도 즉시 반응하여 자연스러운 추종이 되지만, 카메라 흔들림까지 그대로 전달되어 떨림이 심해집니다.', color: 'text-orange-600' },
              ]}
            />

            {/* filterMinCF */}
            <StabilizationSlider
              label='정지 스무딩 (filterMinCF)'
              value={stabilization.filterMinCF}
              min={0.0001}
              max={0.1}
              step={0.0001}
              recommendedValue={RECOMMENDED_STABILIZATION_SETTINGS.filterMinCF}
              defaultValue={DEFAULT_STABILIZATION_SETTINGS.filterMinCF}
              onChange={(v) => onStabilizationChange({ filterMinCF: v })}
              descriptions={[
                { label: '낮을 때 (0.0001~0.001)', text: '카메라가 정지 상태일 때 강한 스무딩이 적용됩니다. 손 떨림으로 인한 미세한 떨림이 효과적으로 제거됩니다.', color: 'text-blue-600' },
                { label: '높을 때 (0.01~0.1)', text: '정지 상태에서도 필터링이 약해져, 센서 노이즈나 미세한 흔들림이 그대로 보입니다. 실시간 반응이 중요한 경우에만 높이세요.', color: 'text-orange-600' },
              ]}
            />

            {/* missTolerance */}
            <StabilizationSlider
              label='추적 유지 프레임 (missTolerance)'
              value={stabilization.missTolerance}
              min={1}
              max={30}
              step={1}
              recommendedValue={RECOMMENDED_STABILIZATION_SETTINGS.missTolerance}
              defaultValue={DEFAULT_STABILIZATION_SETTINGS.missTolerance}
              onChange={(v) => onStabilizationChange({ missTolerance: v })}
              descriptions={[
                { label: '낮을 때 (1~5)', text: '타겟을 놓치면 빠르게 오버레이가 사라집니다. 잘못된 위치에 오버레이가 남아있는 문제를 방지하지만, 일시적인 추적 실패 시 깜빡임(flicker)이 발생할 수 있습니다.', color: 'text-blue-600' },
                { label: '높을 때 (15~30)', text: '타겟을 놓쳐도 오래 유지하여 안정적이지만, 실제로 타겟에서 벗어났을 때도 이전 위치에 오버레이가 남아있어 부자연스러울 수 있습니다.', color: 'text-orange-600' },
              ]}
            />

            {/* matrixLerpFactor */}
            <StabilizationSlider
              label='매트릭스 보간 (matrixLerpFactor)'
              value={stabilization.matrixLerpFactor}
              min={0}
              max={0.95}
              step={0.05}
              recommendedValue={RECOMMENDED_STABILIZATION_SETTINGS.matrixLerpFactor}
              defaultValue={DEFAULT_STABILIZATION_SETTINGS.matrixLerpFactor}
              onChange={(v) => onStabilizationChange({ matrixLerpFactor: v })}
              descriptions={[
                { label: '0 (비활성)', text: 'One-Euro Filter만 사용합니다. 추가 스무딩 없이 기본 필터 동작만 적용됩니다.', color: 'text-gray-600' },
                { label: '0.5~0.8 (권장 범위)', text: '이전 프레임과 현재 프레임을 보간하여 추가 안정화를 적용합니다. 0.7이면 현재값 70% + 이전값 30%를 혼합합니다.', color: 'text-blue-600' },
                { label: '0.9 이상', text: '과도한 보간으로 이전 프레임에 거의 고정되어 움직임에 매우 느리게 반응합니다. 비디오가 "정지된 듯" 보일 수 있습니다.', color: 'text-orange-600' },
              ]}
            />

            <p className='text-xs text-gray-400 mt-2'>
              * 디버그 모드(?mode=debug)에서 실시간으로 값을 조정하면서 최적의 설정을 찾을 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// 안정화 슬라이더 컴포넌트
function StabilizationSlider({
  label,
  value,
  min,
  max,
  step,
  recommendedValue,
  defaultValue,
  onChange,
  descriptions,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  recommendedValue: number
  defaultValue: number
  onChange: (value: number) => void
  descriptions: { label: string; text: string; color: string }[]
}) {
  const isRecommended = value === recommendedValue
  const isDefault = value === defaultValue

  return (
    <div className='space-y-1.5 bg-white rounded-lg p-3 border border-gray-100'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-medium text-gray-700'>{label}</span>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded'>
            {step < 0.01 ? value.toFixed(4) : step < 1 ? value.toFixed(2) : value}
          </span>
          {isRecommended && (
            <span className='text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700'>권장</span>
          )}
          {isDefault && !isRecommended && (
            <span className='text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500'>기본</span>
          )}
        </div>
      </div>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className='w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600'
      />
      <div className='flex justify-between text-[10px] text-gray-400'>
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {/* 상세 설명 */}
      <div className='space-y-1 mt-1'>
        {descriptions.map((desc, i) => (
          <div key={i} className='text-[11px] leading-tight'>
            <span className={`font-medium ${desc.color}`}>{desc.label}: </span>
            <span className='text-gray-500'>{desc.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
