import { HTMLAttributes } from 'react'

type ProgressColor = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
type ProgressSize = 'sm' | 'md' | 'lg'

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number // 0~100
  max?: number // 기본 100
  label?: string // 스크린리더용 라벨 텍스트
  showPercent?: boolean // % 텍스트 표시 여부
  size?: ProgressSize
  color?: ProgressColor
  rounded?: boolean
  striped?: boolean
}

const sizeMap: Record<ProgressSize, string> = {
  sm: 'h-2',
  md: 'h-3.5',
  lg: 'h-4.5 h-5 md:h-4', // 약간 유연하게
}

const colorMap: Record<ProgressColor, string> = {
  primary: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-slate-500',
}

export function Progress({
  value,
  max = 100,
  label = 'Progress',
  showPercent = false,
  size = 'md',
  color = 'primary',
  rounded = true,
  striped = false,
  className = '',
  ...rest
}: ProgressProps) {
  const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), max) : 0
  const percent = max > 0 ? (clamped / max) * 100 : 0

  return (
    <div className={`w-full ${className}`} {...rest}>
      <div
        role='progressbar'
        aria-label={label}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`relative w-full overflow-hidden bg-slate-200 ${
          sizeMap[size]
        } ${rounded ? 'rounded-full' : 'rounded'}`}
      >
        <div
          className={`h-full ${colorMap[color]} ${
            striped
              ? 'bg-[length:1rem_1rem] [background-image:linear-gradient(45deg,rgba(255,255,255,.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.25)_50%,rgba(255,255,255,.25)_75%,transparent_75%,transparent)]'
              : ''
          } transition-[width] duration-300 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {showPercent && (
        <div className='mt-1 text-right text-xs tabular-nums text-slate-600'>
          {Math.round(percent)}%
        </div>
      )}
    </div>
  )
}
