import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { MediaItem } from '../../types/project'
import { ZoomIn, ZoomOut, Move, Maximize2 } from 'lucide-react'
import { Button } from '../ui/button'
import { API_URL } from '../../config/api'

const MIN_SCALE = 0.2
const MAX_SCALE = 5.0

interface UnifiedPreviewCanvasProps {
  items: MediaItem[]
  selectedItemId?: string | null
  onItemSelect?: (id: string) => void
  onItemPositionChange?: (id: string, position: { x: number; y: number }) => void
  onItemScaleChange?: (id: string, scale: number) => void
  targetImageFile?: File | null
  targetImageUrl?: string
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
  targetImageFile,
  targetImageUrl,
  showCamera = false,
  zoom = 1,
  onZoomChange,
}: UnifiedPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mediaPreviewsMap, setMediaPreviewsMap] = useState<Map<string, MediaPreview>>(new Map())
  const [targetImageElement, setTargetImageElement] = useState<HTMLImageElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [initialScale, setInitialScale] = useState(1)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const animationRef = useRef<number>()

  // 캔버스 크기
  const CANVAS_WIDTH = 360
  const CANVAS_HEIGHT = 640

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

  // 타겟 이미지 로드
  useEffect(() => {
    if (!targetImageFile && !targetImageUrl) {
      setTargetImageElement(null)
      return
    }

    const img = new window.Image()
    img.onload = () => setTargetImageElement(img)

    if (targetImageFile) {
      const url = URL.createObjectURL(targetImageFile)
      img.src = url
      return () => URL.revokeObjectURL(url)
    } else if (targetImageUrl) {
      img.src = targetImageUrl
    }
  }, [targetImageFile, targetImageUrl])

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
          video.preload = 'metadata'
          video.onloadeddata = () => {
            video.play().catch(() => {})
            setMediaPreviewsMap((prev) => new Map(prev))
          }
          newPreviews.set(item.id, { id: item.id, element: video, objectUrl: url })
        } else {
          const img = new window.Image()
          img.src = url
          img.onload = () => setMediaPreviewsMap((prev) => new Map(prev))
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
          video.preload = 'metadata'
          video.crossOrigin = 'anonymous'
          video.onloadeddata = () => {
            video.play().catch(() => {})
            setMediaPreviewsMap((prev) => new Map(prev))
          }
          newPreviews.set(item.id, { id: item.id, element: video, objectUrl: null })
        } else {
          const img = new window.Image()
          img.src = url
          img.crossOrigin = 'anonymous'
          img.onload = () => setMediaPreviewsMap((prev) => new Map(prev))
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

    // 카메라 배경 또는 그린 스크린 배경
    if (showCamera && videoRef.current && videoRef.current.readyState >= 2) {
      ctx.drawImage(videoRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    } else {
      // 그린 스크린 배경 (크로마키 테스트용)
      ctx.fillStyle = '#00FF00'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }

    // 타겟 이미지 표시 (있는 경우)
    if (targetImageElement) {
      const targetWidth = CANVAS_WIDTH * 0.6
      const targetHeight = targetWidth * (targetImageElement.height / targetImageElement.width)
      const targetX = (CANVAS_WIDTH - targetWidth) / 2
      const targetY = (CANVAS_HEIGHT - targetHeight) / 2
      ctx.drawImage(targetImageElement, targetX, targetY, targetWidth, targetHeight)
    }

    // 미디어 아이템 렌더링 (순서대로)
    const sortedItems = [...items].sort((a, b) => a.order - b.order)

    sortedItems.forEach((item) => {
      const preview = mediaPreviewsMap.get(item.id)
      if (!preview?.element) return

      // 트래킹 모드에서 크로마키가 꺼져있으면 표시하지 않음
      if (item.mode === 'tracking' && item.type === 'video' && !item.chromaKeyEnabled) {
        return
      }

      const element = preview.element

      // 미디어 크기 계산
      const mediaWidth = CANVAS_WIDTH * 0.4 * item.scale * zoom
      const mediaHeight = mediaWidth / item.aspectRatio

      // 위치 계산 (normalized coordinates)
      const mediaX = item.position.x * CANVAS_WIDTH - mediaWidth / 2
      const mediaY = item.position.y * CANVAS_HEIGHT - mediaHeight / 2

      // 선택된 아이템 하이라이트
      if (selectedItemId === item.id) {
        ctx.strokeStyle = '#8B5CF6'
        ctx.lineWidth = 2
        ctx.strokeRect(mediaX - 2, mediaY - 2, mediaWidth + 4, mediaHeight + 4)
      }

      // 미디어 그리기
      ctx.drawImage(element, mediaX, mediaY, mediaWidth, mediaHeight)
    })

    animationRef.current = requestAnimationFrame(render)
  }, [items, mediaPreviewsMap, targetImageElement, selectedItemId, showCamera, zoom])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [render])

  // 선택된 아이템의 위치와 크기 계산 (리사이즈 핸들 오버레이용)
  const selectedItemBounds = useMemo(() => {
    if (!selectedItemId) return null

    const selectedItem = items.find((item) => item.id === selectedItemId)
    if (!selectedItem) return null

    const mediaWidth = CANVAS_WIDTH * 0.4 * selectedItem.scale * zoom
    const mediaHeight = mediaWidth / selectedItem.aspectRatio

    const mediaX = selectedItem.position.x * CANVAS_WIDTH - mediaWidth / 2
    const mediaY = selectedItem.position.y * CANVAS_HEIGHT - mediaHeight / 2

    return {
      left: mediaX,
      top: mediaY,
      width: mediaWidth,
      height: mediaHeight,
    }
  }, [selectedItemId, items, zoom])

  // 드래그 핸들러 (위치 이동)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedItemId || isResizing) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    setIsDragging(true)
    setDragStart({ x, y })
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

    setIsResizing(true)
    setDragStart({ x: clientX, y: clientY })
    setInitialScale(selectedItem.scale)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectedItemId) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    if (isResizing) {
      // 리사이즈 모드
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      const diagonal = (deltaX + deltaY) / 2
      const scaleDelta = diagonal / (rect.width * 0.25)

      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, initialScale + scaleDelta))
      onItemScaleChange?.(selectedItemId, newScale)
    } else if (isDragging) {
      // 위치 이동 모드
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      const dx = x - dragStart.x
      const dy = y - dragStart.y

      const selectedItem = items.find((item) => item.id === selectedItemId)
      if (!selectedItem) return

      const newX = Math.max(0, Math.min(1, selectedItem.position.x + dx))
      const newY = Math.max(0, Math.min(1, selectedItem.position.y + dy))

      onItemPositionChange?.(selectedItemId, { x: newX, y: newY })
      setDragStart({ x, y })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  // 터치 이벤트 핸들러 (리사이즈용)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isResizing || !selectedItemId) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - dragStart.x
    const deltaY = touch.clientY - dragStart.y
    const diagonal = (deltaX + deltaY) / 2
    const scaleDelta = diagonal / (rect.width * 0.25)

    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, initialScale + scaleDelta))
    onItemScaleChange?.(selectedItemId, newScale)
  }

  const handleTouchEnd = () => {
    setIsResizing(false)
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
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
              onTouchStart={handleResizeStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
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
    </div>
  )
}
