import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { MediaItem } from '../../types/project'
import { ZoomIn, ZoomOut, Move, Maximize2 } from 'lucide-react'
import { Button } from '../ui/button'
import { API_URL } from '../../config/api'
import { isValidHexColor } from '../../utils/validation'

const MIN_SCALE = 0.2
const MAX_SCALE = 5.0

// HEX to RGB 변환
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 255, b: 0 }
}

interface UnifiedPreviewCanvasProps {
  items: MediaItem[]
  selectedItemId?: string | null
  onItemSelect?: (id: string) => void
  onItemPositionChange?: (id: string, position: { x: number; y: number }) => void
  onItemScaleChange?: (id: string, scale: number) => void
  showCamera?: boolean
  zoom?: number
  onZoomChange?: (zoom: number) => void
}

interface MediaPreview {
  id: string
  element: HTMLVideoElement | HTMLImageElement | null
  objectUrl: string | null
}

export default function UnifiedPreviewCanvas({
  items,
  selectedItemId,
  onItemSelect,
  onItemPositionChange,
  onItemScaleChange,
  showCamera = false,
  zoom = 1,
  onZoomChange,
}: UnifiedPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mediaPreviewsMap, setMediaPreviewsMap] = useState<Map<string, MediaPreview>>(new Map())
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const animationRef = useRef<number>()
  const checkerPatternRef = useRef<CanvasPattern | null>(null)
  const chromaKeyTempCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // 드래그 상태를 ref로 관리 (리렌더링 방지)
  const dragStateRef = useRef({
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    initialPosition: { x: 0.5, y: 0.5 },
    initialScale: 1,
  })

  // 로컬 오버라이드 (드래그 중 부모 업데이트 없이 렌더링)
  const [localOverride, setLocalOverride] = useState<{
    position?: { x: number; y: number }
    scale?: number
  } | null>(null)

  // 크로마키 미리보기 줌 (별도 관리)
  const [chromaKeyZoom, setChromaKeyZoom] = useState(1)
  const chromaKeyCanvasRef = useRef<HTMLCanvasElement>(null)
  const chromaKeyAnimationRef = useRef<number>()

  // 캔버스 크기
  const CANVAS_WIDTH = 360
  const CANVAS_HEIGHT = 640

  // 트래킹 모드 + 크로마키 활성화된 영상 필터링
  const chromaKeyItems = useMemo(() => {
    return items.filter(
      item => item.type === 'video' && item.mode === 'tracking' && item.chromaKeyEnabled
    )
  }, [items])

  // 체커보드 패턴 생성 함수
  const getCheckerPattern = useCallback((ctx: CanvasRenderingContext2D) => {
    if (checkerPatternRef.current) return checkerPatternRef.current

    // 체커보드 패턴용 작은 캔버스 생성
    const patternCanvas = document.createElement('canvas')
    const patternSize = 20 // 10px * 2
    patternCanvas.width = patternSize
    patternCanvas.height = patternSize
    const patternCtx = patternCanvas.getContext('2d')
    if (!patternCtx) return null

    // 체커보드 패턴 그리기
    patternCtx.fillStyle = '#CCCCCC'
    patternCtx.fillRect(0, 0, 10, 10)
    patternCtx.fillRect(10, 10, 10, 10)
    patternCtx.fillStyle = '#999999'
    patternCtx.fillRect(10, 0, 10, 10)
    patternCtx.fillRect(0, 10, 10, 10)

    // 패턴 생성 및 캐싱
    checkerPatternRef.current = ctx.createPattern(patternCanvas, 'repeat')
    return checkerPatternRef.current
  }, [])

  // 카메라 스트림 초기화
  useEffect(() => {
    if (!showCamera) return

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 1280, height: 720 },
        })
        setCameraStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.warn('Camera access failed:', err)
      }
    }

    initCamera()

    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop())
    }
  }, [showCamera])

  // 미디어 프리뷰 로드
  useEffect(() => {
    const newPreviews = new Map<string, MediaPreview>()

    items.forEach((item) => {
      const existingPreview = mediaPreviewsMap.get(item.id)

      // 이미 로드된 경우 재사용
      if (existingPreview && existingPreview.element) {
        const isSameFile =
          (item.file && existingPreview.objectUrl === URL.createObjectURL(item.file)) ||
          (!item.file && item.existingFileId)
        if (isSameFile) {
          newPreviews.set(item.id, existingPreview)
          return
        }
      }

      // 새로 로드
      if (item.file) {
        const url = URL.createObjectURL(item.file)
        if (item.type === 'video') {
          const video = document.createElement('video')
          video.src = url
          video.muted = true
          video.loop = true
          video.playsInline = true
          video.preload = 'auto'
          video.onloadeddata = () => {
            console.log('Video loaded (file):', item.id, video.readyState)
            video.play().catch(() => {})
            setMediaPreviewsMap((prev) => new Map(prev))
          }
          video.onerror = () => console.error('Video load error (file):', item.id)
          newPreviews.set(item.id, { id: item.id, element: video, objectUrl: url })
        } else {
          const img = new window.Image()
          img.src = url
          img.onload = () => {
            console.log('Image loaded (file):', item.id, img.naturalWidth, img.naturalHeight)
            setMediaPreviewsMap((prev) => new Map(prev))
          }
          img.onerror = () => console.error('Image load error (file):', item.id)
          newPreviews.set(item.id, { id: item.id, element: img, objectUrl: url })
        }
      } else if (item.existingFileId) {
        const url = `${API_URL}/file/${item.existingFileId}`
        if (item.type === 'video') {
          const video = document.createElement('video')
          video.src = url
          video.muted = true
          video.loop = true
          video.playsInline = true
          video.preload = 'auto'
          video.crossOrigin = 'anonymous'
          video.onloadeddata = () => {
            console.log('Video loaded (existing):', item.id, video.readyState)
            video.play().catch(() => {})
            setMediaPreviewsMap((prev) => new Map(prev))
          }
          video.onerror = () => console.error('Video load error (existing):', item.id)
          newPreviews.set(item.id, { id: item.id, element: video, objectUrl: null })
        } else {
          const img = new window.Image()
          img.src = url
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            console.log('Image loaded (existing):', item.id, img.naturalWidth, img.naturalHeight)
            setMediaPreviewsMap((prev) => new Map(prev))
          }
          img.onerror = () => console.error('Image load error (existing):', item.id)
          newPreviews.set(item.id, { id: item.id, element: img, objectUrl: null })
        }
      }
    })

    // 이전 URL 정리
    mediaPreviewsMap.forEach((preview, id) => {
      if (!newPreviews.has(id) && preview.objectUrl) {
        URL.revokeObjectURL(preview.objectUrl)
        if (preview.element instanceof HTMLVideoElement) {
          preview.element.pause()
        }
      }
    })

    setMediaPreviewsMap(newPreviews)

    return () => {
      newPreviews.forEach((preview) => {
        if (preview.objectUrl) {
          URL.revokeObjectURL(preview.objectUrl)
        }
        if (preview.element instanceof HTMLVideoElement) {
          preview.element.pause()
        }
      })
    }
  }, [items])

  // 캔버스 렌더링
  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // 캔버스 클리어
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // 카메라 배경 또는 체커보드 배경
    if (showCamera && videoRef.current && videoRef.current.readyState >= 2) {
      ctx.drawImage(videoRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    } else {
      // 체커보드 패턴 배경
      const pattern = getCheckerPattern(ctx)
      if (pattern) {
        ctx.fillStyle = pattern
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      }
    }

    // 미디어 아이템 렌더링 (순서대로)
    const sortedItems = [...items].sort((a, b) => a.order - b.order)

    sortedItems.forEach((item) => {
      const preview = mediaPreviewsMap.get(item.id)
      if (!preview?.element) return

      const element = preview.element

      // 비디오인 경우 로드 상태 확인 (readyState >= 1이면 첫 프레임 그리기 가능)
      if (element instanceof HTMLVideoElement && element.readyState < 1) {
        return // 아직 로드되지 않음
      }

      // 이미지인 경우 로드 상태 확인 (naturalWidth > 0이면 로드 완료)
      if (element instanceof HTMLImageElement && element.naturalWidth === 0) {
        return // 아직 로드되지 않음
      }

      // 드래그 중인 선택된 아이템은 로컬 오버라이드 값 사용
      const isSelected = selectedItemId === item.id
      const position = isSelected && localOverride?.position ? localOverride.position : item.position
      const scale = isSelected && localOverride?.scale !== undefined ? localOverride.scale : item.scale

      // 미디어 크기 계산
      const mediaWidth = CANVAS_WIDTH * 0.4 * scale * zoom
      const mediaHeight = mediaWidth / item.aspectRatio

      // 위치 계산 (normalized coordinates)
      const mediaX = position.x * CANVAS_WIDTH - mediaWidth / 2
      const mediaY = position.y * CANVAS_HEIGHT - mediaHeight / 2

      // 미디어 그리기
      try {
        // 크로마키가 활성화된 비디오인 경우 크로마키 처리
        if (item.type === 'video' && item.chromaKeyEnabled && element instanceof HTMLVideoElement) {
          // 임시 캔버스 생성 또는 재사용
          if (!chromaKeyTempCanvasRef.current) {
            chromaKeyTempCanvasRef.current = document.createElement('canvas')
          }
          const tempCanvas = chromaKeyTempCanvasRef.current
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })

          if (tempCtx) {
            // 임시 캔버스 크기 설정
            const srcWidth = element.videoWidth || 320
            const srcHeight = element.videoHeight || 180
            tempCanvas.width = srcWidth
            tempCanvas.height = srcHeight

            // 비디오를 임시 캔버스에 그리기
            tempCtx.drawImage(element, 0, 0, srcWidth, srcHeight)

            // 크로마키 처리
            const keyColor = hexToRgb(isValidHexColor(item.chromaKeyColor) ? item.chromaKeyColor : '#00FF00')
            const { similarity, smoothness } = item.chromaKeySettings

            const imageData = tempCtx.getImageData(0, 0, srcWidth, srcHeight)
            const data = imageData.data

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]

              // 색상 거리 계산 (정규화)
              const distance =
                Math.sqrt(
                  Math.pow(r - keyColor.r, 2) +
                  Math.pow(g - keyColor.g, 2) +
                  Math.pow(b - keyColor.b, 2)
                ) / Math.sqrt(3) / 255

              // 알파 계산
              if (distance < similarity) {
                data[i + 3] = 0
              } else if (distance < similarity + smoothness) {
                const alpha = (distance - similarity) / smoothness
                data[i + 3] = Math.round(alpha * 255)
              }
            }

            tempCtx.putImageData(imageData, 0, 0)

            // 처리된 이미지를 메인 캔버스에 그리기
            ctx.drawImage(tempCanvas, mediaX, mediaY, mediaWidth, mediaHeight)
          }
        } else {
          // 일반 미디어는 그대로 그리기
          ctx.drawImage(element, mediaX, mediaY, mediaWidth, mediaHeight)
        }
      } catch (err) {
        console.warn('Failed to draw media:', item.id, err)
      }

      // 선택된 아이템 하이라이트
      if (isSelected) {
        ctx.strokeStyle = '#8B5CF6'
        ctx.lineWidth = 2
        ctx.strokeRect(mediaX - 2, mediaY - 2, mediaWidth + 4, mediaHeight + 4)
      }
    })

    animationRef.current = requestAnimationFrame(render)
  }, [items, mediaPreviewsMap, selectedItemId, showCamera, zoom, localOverride, getCheckerPattern])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [render])

  // 크로마키 미리보기 캔버스 렌더링
  const renderChromaKey = useCallback(() => {
    const canvas = chromaKeyCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || chromaKeyItems.length === 0) return

    // 첫 번째 크로마키 영상의 비율로 캔버스 크기 결정
    const firstItem = chromaKeyItems[0]
    const preview = mediaPreviewsMap.get(firstItem.id)
    if (!preview?.element) return

    const videoElement = preview.element as HTMLVideoElement
    if (videoElement.readyState < 2) {
      chromaKeyAnimationRef.current = requestAnimationFrame(renderChromaKey)
      return
    }

    // 영상 실제 비율 유지
    const videoWidth = videoElement.videoWidth || 320
    const videoHeight = videoElement.videoHeight || 180
    const aspectRatio = videoWidth / videoHeight

    // 캔버스 크기 계산 (최대 너비 기준)
    const maxWidth = 360
    const displayWidth = maxWidth * chromaKeyZoom
    const displayHeight = displayWidth / aspectRatio

    canvas.width = displayWidth
    canvas.height = displayHeight

    // 배경 클리어
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, displayWidth, displayHeight)

    // 영상 그리기
    ctx.drawImage(videoElement, 0, 0, displayWidth, displayHeight)

    chromaKeyAnimationRef.current = requestAnimationFrame(renderChromaKey)
  }, [chromaKeyItems, mediaPreviewsMap, chromaKeyZoom])

  // 크로마키 미리보기 애니메이션 시작/정지
  useEffect(() => {
    if (chromaKeyItems.length > 0) {
      chromaKeyAnimationRef.current = requestAnimationFrame(renderChromaKey)
    }
    return () => {
      if (chromaKeyAnimationRef.current) {
        cancelAnimationFrame(chromaKeyAnimationRef.current)
      }
    }
  }, [renderChromaKey, chromaKeyItems.length])

  // 선택된 아이템의 위치와 크기 계산 (리사이즈 핸들 오버레이용)
  const selectedItemBounds = useMemo(() => {
    if (!selectedItemId) return null

    const selectedItem = items.find((item) => item.id === selectedItemId)
    if (!selectedItem) return null

    // 드래그 중이면 로컬 오버라이드 값 사용
    const position = localOverride?.position ?? selectedItem.position
    const scale = localOverride?.scale ?? selectedItem.scale

    const mediaWidth = CANVAS_WIDTH * 0.4 * scale * zoom
    const mediaHeight = mediaWidth / selectedItem.aspectRatio

    const mediaX = position.x * CANVAS_WIDTH - mediaWidth / 2
    const mediaY = position.y * CANVAS_HEIGHT - mediaHeight / 2

    return {
      left: mediaX,
      top: mediaY,
      width: mediaWidth,
      height: mediaHeight,
    }
  }, [selectedItemId, items, zoom, localOverride])

  // 전역 마우스 이벤트 핸들러 (드래그/리사이즈 중)
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    const { isDragging, isResizing, startX, startY, initialPosition, initialScale } = dragStateRef.current

    if (!isDragging && !isResizing) return
    if (!selectedItemId) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    if (isResizing) {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      const diagonal = (deltaX + deltaY) / 2
      const scaleDelta = diagonal / (rect.width * 0.25)

      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, initialScale + scaleDelta))
      setLocalOverride({ scale: newScale })
    } else if (isDragging) {
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      const dx = x - startX
      const dy = y - startY

      const newX = Math.max(0, Math.min(1, initialPosition.x + dx))
      const newY = Math.max(0, Math.min(1, initialPosition.y + dy))

      setLocalOverride({ position: { x: newX, y: newY } })
    }
  }, [selectedItemId])

  // localOverride 변경 감지하여 부모에 전달 (드래그 종료 시)
  const localOverrideRef = useRef(localOverride)
  localOverrideRef.current = localOverride

  const commitChanges = useCallback(() => {
    const override = localOverrideRef.current
    if (selectedItemId && override) {
      if (override.position) {
        onItemPositionChange?.(selectedItemId, override.position)
      }
      if (override.scale !== undefined) {
        onItemScaleChange?.(selectedItemId, override.scale)
      }
    }
    setLocalOverride(null)
  }, [selectedItemId, onItemPositionChange, onItemScaleChange])

  // 드래그 핸들러 (위치 이동)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedItemId || dragStateRef.current.isResizing) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const selectedItem = items.find((item) => item.id === selectedItemId)
    if (!selectedItem) return

    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    dragStateRef.current = {
      isDragging: true,
      isResizing: false,
      startX: x,
      startY: y,
      initialPosition: { ...selectedItem.position },
      initialScale: selectedItem.scale,
    }

    // 전역 이벤트 리스너 등록
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', () => {
      commitChanges()
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      dragStateRef.current.isDragging = false
      dragStateRef.current.isResizing = false
    }, { once: true })
  }

  // 리사이즈 핸들러
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!selectedItemId) return

    const selectedItem = items.find((item) => item.id === selectedItemId)
    if (!selectedItem) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    dragStateRef.current = {
      isDragging: false,
      isResizing: true,
      startX: clientX,
      startY: clientY,
      initialPosition: { ...selectedItem.position },
      initialScale: selectedItem.scale,
    }

    // 전역 이벤트 리스너 등록
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', () => {
      commitChanges()
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      dragStateRef.current.isDragging = false
      dragStateRef.current.isResizing = false
    }, { once: true })
  }

  // 터치 이벤트 핸들러
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragStateRef.current.isResizing || !selectedItemId) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const { startX, startY, initialScale } = dragStateRef.current
    const touch = e.touches[0]
    const deltaX = touch.clientX - startX
    const deltaY = touch.clientY - startY
    const diagonal = (deltaX + deltaY) / 2
    const scaleDelta = diagonal / (rect.width * 0.25)

    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, initialScale + scaleDelta))
    setLocalOverride({ scale: newScale })
  }, [selectedItemId])

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!selectedItemId) return

    const selectedItem = items.find((item) => item.id === selectedItemId)
    if (!selectedItem) return

    const touch = e.touches[0]

    dragStateRef.current = {
      isDragging: false,
      isResizing: true,
      startX: touch.clientX,
      startY: touch.clientY,
      initialPosition: { ...selectedItem.position },
      initialScale: selectedItem.scale,
    }

    // 전역 터치 이벤트 리스너 등록
    const onTouchEnd = () => {
      commitChanges()
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      dragStateRef.current.isResizing = false
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { once: true })
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    // 클릭 위치에서 가장 가까운 아이템 찾기
    const sortedItems = [...items].sort((a, b) => b.order - a.order) // 위에서부터 검사
    for (const item of sortedItems) {
      const preview = mediaPreviewsMap.get(item.id)
      if (!preview?.element) continue

      const mediaWidth = (CANVAS_WIDTH * 0.4 * item.scale * zoom) / CANVAS_WIDTH
      const mediaHeight = mediaWidth / item.aspectRatio

      const left = item.position.x - mediaWidth / 2
      const right = item.position.x + mediaWidth / 2
      const top = item.position.y - mediaHeight / 2
      const bottom = item.position.y + mediaHeight / 2

      if (x >= left && x <= right && y >= top && y <= bottom) {
        onItemSelect?.(item.id)
        return
      }
    }
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {/* 캔버스 */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full cursor-move"
          onMouseDown={handleMouseDown}
          onClick={handleCanvasClick}
        />

        {/* 리사이즈 핸들 오버레이 (선택된 아이템이 있을 때만) */}
        {selectedItemId && selectedItemBounds && (
          <div
            className="absolute pointer-events-none border-2 border-purple-500 border-dashed"
            style={{
              left: `${(selectedItemBounds.left / CANVAS_WIDTH) * 100}%`,
              top: `${(selectedItemBounds.top / CANVAS_HEIGHT) * 100}%`,
              width: `${(selectedItemBounds.width / CANVAS_WIDTH) * 100}%`,
              height: `${(selectedItemBounds.height / CANVAS_HEIGHT) * 100}%`,
            }}
          >
            {/* 우하단 리사이즈 핸들 */}
            <div
              className="absolute -bottom-2 -right-2 w-5 h-5 bg-purple-500 rounded-tl-md cursor-nwse-resize pointer-events-auto flex items-center justify-center shadow-md hover:bg-purple-600 active:bg-purple-700 transition-colors"
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeTouchStart}
            >
              <Maximize2 size={10} className="text-white rotate-90" />
            </div>
            {/* 중앙 이동 아이콘 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/40 flex items-center justify-center">
              <Move size={12} className="text-white" />
            </div>
          </div>
        )}

        {/* 숨겨진 카메라 비디오 */}
        {showCamera && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="hidden"
          />
        )}
      </div>

      {/* 줌 컨트롤 */}
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onZoomChange?.(Math.max(0.5, zoom - 0.1))}
          disabled={zoom <= 0.5}
          className="h-8 w-8"
        >
          <ZoomOut size={16} />
        </Button>
        <div className="flex items-center gap-2 px-3">
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={zoom}
            onChange={(e) => onZoomChange?.(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-gray-600 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onZoomChange?.(Math.min(2, zoom + 0.1))}
          disabled={zoom >= 2}
          className="h-8 w-8"
        >
          <ZoomIn size={16} />
        </Button>
      </div>

      {/* 안내 메시지 */}
      {selectedItemId && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <Move size={14} />
          <span>드래그: 위치 이동</span>
          <span className="text-gray-300">|</span>
          <Maximize2 size={14} />
          <span>우하단 모서리: 크기 조절</span>
        </div>
      )}

      {/* 트래킹 모드 크로마키 미리보기 (별도 영역) */}
      {chromaKeyItems.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            트래킹 모드 크로마키 미리보기
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            트래킹모드 + 크로마키 영상은 타겟 이미지 위에 실제 비율로 표시됩니다
          </p>

          {/* 크로마키 캔버스 */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center p-2">
            <canvas
              ref={chromaKeyCanvasRef}
              className="max-w-full rounded"
              style={{ maxHeight: '400px' }}
            />
          </div>

          {/* 크로마키 크기 컨트롤 */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setChromaKeyZoom(Math.max(0.5, chromaKeyZoom - 0.1))}
              disabled={chromaKeyZoom <= 0.5}
              className="h-7 w-7"
            >
              <ZoomOut size={14} />
            </Button>
            <div className="flex items-center gap-2 px-2">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={chromaKeyZoom}
                onChange={(e) => setChromaKeyZoom(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-xs text-gray-400 w-10 text-center">
                {Math.round(chromaKeyZoom * 100)}%
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setChromaKeyZoom(Math.min(2, chromaKeyZoom + 0.1))}
              disabled={chromaKeyZoom >= 2}
              className="h-7 w-7"
            >
              <ZoomIn size={14} />
            </Button>
          </div>

          {/* 크로마키 영상 목록 */}
          <div className="mt-3 space-y-1">
            {chromaKeyItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded"
              >
                <div
                  className="w-3 h-3 rounded-sm border border-gray-600"
                  style={{ backgroundColor: item.chromaKeyColor }}
                />
                <span>영상 {index + 1}</span>
                <span className="text-gray-500">({item.chromaKeyColor})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
