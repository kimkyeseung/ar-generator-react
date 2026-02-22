/**
 * AR 뷰어 디버그 패널
 * URL에 ?mode=debug 추가 시 표시됨
 */

import { CameraResolution, VideoQuality } from '../../types/project'

interface DebugPanelProps {
  cameraResolution: CameraResolution
  videoQuality: VideoQuality
  isHDReady: boolean
  hasPreviewVideo: boolean
  videoResolution: string | null
  videoFileSize: number | null
  stabilizationEnabled: boolean
  filterMinCF: number
  filterBeta: number
  onToggleStabilization: () => void
  onFilterMinCFChange: (value: number) => void
  onFilterBetaChange: (value: number) => void
}

export function DebugPanel({
  cameraResolution,
  videoQuality,
  isHDReady,
  hasPreviewVideo,
  videoResolution,
  videoFileSize,
  stabilizationEnabled,
  filterMinCF,
  filterBeta,
  onToggleStabilization,
  onFilterMinCFChange,
  onFilterBetaChange,
}: DebugPanelProps) {
  const qualityLabel = videoQuality === 'high' ? '고화질' : videoQuality === 'medium' ? '중화질' : '저화질'
  const qualityColor = videoQuality === 'high' ? 'bg-purple-500' : videoQuality === 'medium' ? 'bg-blue-500' : 'bg-orange-500'
  const isPlayingOriginal = !hasPreviewVideo || isHDReady

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 p-4 text-white backdrop-blur-sm">
      <div className="mx-auto max-w-md space-y-3">
        {/* 상태 표시 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">디버그 모드</span>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge color="bg-blue-500">📷 {cameraResolution.toUpperCase()}</Badge>
            <Badge color={qualityColor}>🎬 {qualityLabel}</Badge>
            <Badge color={isPlayingOriginal ? 'bg-green-500' : 'bg-yellow-500'}>
              {isPlayingOriginal ? '🔄 원본 재생중' : '⏳ 프리뷰 재생중'}
            </Badge>
            {videoResolution && <Badge color="bg-indigo-500">🖥️ {videoResolution}</Badge>}
            {videoFileSize && (
              <Badge color="bg-teal-500">💾 {(videoFileSize / 1024 / 1024).toFixed(1)}MB</Badge>
            )}
          </div>
        </div>

        {/* 떨림 보정 토글 */}
        <div className="flex items-center justify-between">
          <span className="text-sm">떨림 보정 (Stabilization)</span>
          <button
            onClick={onToggleStabilization}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              stabilizationEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {stabilizationEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* 필터 파라미터 슬라이더 */}
        {stabilizationEnabled && (
          <>
            <Slider
              label="filterMinCF (낮을수록 부드러움)"
              value={filterMinCF}
              min={0.0001}
              max={0.1}
              step={0.0001}
              onChange={onFilterMinCFChange}
            />
            <Slider
              label="filterBeta (높을수록 반응 빠름)"
              value={filterBeta}
              min={0}
              max={2000}
              step={10}
              onChange={onFilterBetaChange}
            />
          </>
        )}

        <p className="text-xs text-gray-400">* 실시간 반영됨</p>
      </div>
    </div>
  )
}

// 배지 컴포넌트
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className={`text-xs px-2 py-0.5 rounded ${color}`}>{children}</span>
}

// 슬라이더 컴포넌트
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  )
}
