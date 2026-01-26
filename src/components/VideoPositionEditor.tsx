import { useCallback, useEffect, useRef, useState } from 'react'
import { VideoPosition } from '../types/project'

interface VideoPositionEditorProps {
  videoFile?: File // 새로 업로드한 비디오 파일
  videoSrc?: string // 기존 비디오 URL (서버에서 가져온 경우)
  position: VideoPosition
  scale: number
  onPositionChange: (position: VideoPosition) => void
  onScaleChange: (scale: number) => void
  chromaKeyColor?: string
}

const MIN_SCALE = 0.2
const MAX_SCALE = 2.0
const SCALE_STEP = 0.1

type DragMode = 'none' | 'pan' | 'resize'

export default function VideoPositionEditor({
  videoFile,
  videoSrc,
  position,
  scale,
  onPositionChange,
  onScaleChange,
  chromaKeyColor,
}: VideoPositionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const [dragMode, setDragMode] = useState<DragMode>('none')
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialPosition, setInitialPosition] = useState({ x: 0.5, y: 0.5 })
  const [initialScale, setInitialScale] = useState(1)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  // 비디오 URL 생성
  useEffect(() => {
    // videoSrc가 있으면 그것을 사용 (기존 비디오 URL)
    if (videoSrc) {
      setVideoUrl(videoSrc)
      return
    }
    // videoFile이 있으면 ObjectURL 생성 (새로 업로드한 파일)
    if (videoFile) {
      const url = URL.createObjectURL(videoFile)
      setVideoUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    // 둘 다 없으면 null
    setVideoUrl(null)
  }, [videoFile, videoSrc])

  // 카메라 시작
  useEffect(() => {
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream
        }
        setCameraError(null)
      } catch (err) {
        console.error('Camera access error:', err)
        setCameraError('카메라 접근 권한이 필요합니다.')
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // 패닝 드래그 시작
  const handlePanStart = useCallback(
    (clientX: number, clientY: number) => {
      setDragMode('pan')
      setDragStart({ x: clientX, y: clientY })
      setInitialPosition({ x: position.x, y: position.y })
    },
    [position]
  )

  // 리사이즈 드래그 시작
  const handleResizeStart = useCallback(
    (clientX: number, clientY: number) => {
      setDragMode('resize')
      setDragStart({ x: clientX, y: clientY })
      setInitialScale(scale)
    },
    [scale]
  )

  // 마우스/터치 드래그 중
  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (dragMode === 'none' || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()

      if (dragMode === 'pan') {
        // 패닝 모드: 위치 변경
        const deltaX = (clientX - dragStart.x) / rect.width
        const deltaY = (clientY - dragStart.y) / rect.height

        const newX = Math.max(0, Math.min(1, initialPosition.x + deltaX))
        const newY = Math.max(0, Math.min(1, initialPosition.y + deltaY))

        onPositionChange({ x: newX, y: newY })
      } else if (dragMode === 'resize') {
        // 리사이즈 모드: 크기 변경 (우하단 방향으로 드래그)
        const deltaX = clientX - dragStart.x
        const deltaY = clientY - dragStart.y
        // 대각선 방향 거리 계산 (우하단이 양수)
        const diagonal = (deltaX + deltaY) / 2
        const scaleDelta = diagonal / (rect.width * 0.25) // 감도 조절

        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, initialScale + scaleDelta))
        onScaleChange(newScale)
      }
    },
    [dragMode, dragStart, initialPosition, initialScale, onPositionChange, onScaleChange]
  )

  // 마우스/터치 드래그 종료
  const handleDragEnd = useCallback(() => {
    setDragMode('none')
  }, [])

  // 마우스 이벤트 (비디오 영역 패닝)
  const handleVideoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handlePanStart(e.clientX, e.clientY)
  }

  // 리사이즈 핸들 마우스 이벤트
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleResizeStart(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    handleDragEnd()
  }

  // 터치 이벤트 (비디오 영역 패닝)
  const handleVideoTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.stopPropagation()
      const touch = e.touches[0]
      handlePanStart(touch.clientX, touch.clientY)
    }
  }

  // 리사이즈 핸들 터치 이벤트
  const handleResizeTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.stopPropagation()
      const touch = e.touches[0]
      handleResizeStart(touch.clientX, touch.clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      handleDragMove(touch.clientX, touch.clientY)
    }
  }

  const handleTouchEnd = () => {
    handleDragEnd()
  }

  // 크기 버튼
  const handleScaleUp = () => {
    const newScale = Math.min(MAX_SCALE, scale + SCALE_STEP)
    onScaleChange(newScale)
  }

  const handleScaleDown = () => {
    const newScale = Math.max(MIN_SCALE, scale - SCALE_STEP)
    onScaleChange(newScale)
  }

  // 위치 초기화
  const handleReset = () => {
    onPositionChange({ x: 0.5, y: 0.5 })
    onScaleChange(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          영상 위치 조정
        </h3>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-purple-600 hover:text-purple-700"
        >
          초기화
        </button>
      </div>

      {/* 프리뷰 영역 */}
      <div
        ref={containerRef}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border-2 border-gray-200 bg-black"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 카메라 배경 */}
        <video
          ref={cameraRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* 카메라 에러 */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <p className="text-sm text-white">{cameraError}</p>
          </div>
        )}

        {/* 비디오 오버레이 */}
        {videoUrl && (
          <div
            className="absolute cursor-move"
            data-testid="video-overlay"
            style={{
              left: `${position.x * 100}%`,
              top: `${position.y * 100}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              width: '50%',
              aspectRatio: '16/9',
            }}
            onMouseDown={handleVideoMouseDown}
            onTouchStart={handleVideoTouchStart}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-contain pointer-events-none"
              style={{
                opacity: chromaKeyColor ? 0.9 : 1,
              }}
            />
            {/* 드래그 경계선 표시 */}
            <div className="absolute inset-0 border-2 border-dashed border-white/50 pointer-events-none" />
            {/* 중앙 이동 아이콘 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/30 pointer-events-none flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
            {/* 우하단 리사이즈 핸들 */}
            <div
              className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center bg-purple-500 rounded-tl-lg"
              data-testid="resize-handle"
              onMouseDown={handleResizeMouseDown}
              onTouchStart={handleResizeTouchStart}
            >
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 20L20 4M12 20L20 12M20 20L20 20" />
              </svg>
            </div>
          </div>
        )}

        {/* 안내 텍스트 */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
          <p className="text-xs text-white">드래그: 위치 | 우하단 모서리: 크기</p>
        </div>
      </div>

      {/* 크기 조정 */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">크기</span>
        <div className="flex flex-1 items-center gap-2">
          <button
            type="button"
            onClick={handleScaleDown}
            disabled={scale <= MIN_SCALE}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            -
          </button>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={SCALE_STEP}
            value={scale}
            onChange={(e) => onScaleChange(parseFloat(e.target.value))}
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleScaleUp}
            disabled={scale >= MAX_SCALE}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            +
          </button>
        </div>
        <span className="w-12 text-right text-sm text-gray-500">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* 위치 정보 */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>X: {Math.round(position.x * 100)}%</span>
        <span>Y: {Math.round(position.y * 100)}%</span>
      </div>
    </div>
  )
}
