type ArOptionsSectionProps = {
  highPrecision: boolean
  onHighPrecisionChange: (value: boolean) => void
}

export default function ArOptionsSection({
  highPrecision,
  onHighPrecisionChange,
}: ArOptionsSectionProps) {
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
    </div>
  )
}
