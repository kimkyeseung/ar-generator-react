import { useState } from 'react'
import { Video, Image as ImageIcon, GripVertical, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { MediaItem, MediaType, createDefaultMediaItem } from '../../types/project'
import MediaItemEditor from './MediaItemEditor'

interface MediaItemListProps {
  items: MediaItem[]
  onItemsChange: (items: MediaItem[]) => void
  disabled?: boolean
  onItemSelect?: (id: string) => void
  selectedItemId?: string | null
}

let mediaItemIdCounter = 0
const generateMediaItemId = () => `media-${Date.now()}-${++mediaItemIdCounter}`

export default function MediaItemList({
  items,
  onItemsChange,
  disabled = false,
  onItemSelect,
  selectedItemId,
}: MediaItemListProps) {
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const handleAddItem = (type: MediaType) => {
    const newItem = createDefaultMediaItem(
      generateMediaItemId(),
      type,
      items.length
    )
    onItemsChange([...items, newItem])
    onItemSelect?.(newItem.id)
  }

  const handleRemoveItem = (id: string) => {
    const newItems = items
      .filter((item) => item.id !== id)
      .map((item, index) => ({ ...item, order: index }))
    onItemsChange(newItems)
    if (selectedItemId === id && newItems.length > 0) {
      onItemSelect?.(newItems[0].id)
    }
  }

  const handleItemChange = (id: string, updates: Partial<MediaItem>) => {
    onItemsChange(
      items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    )
  }

  const handleMoveItem = (id: string, direction: 'up' | 'down') => {
    const currentIndex = items.findIndex((item) => item.id === id)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= items.length) return

    const newItems = [...items]
    const [removed] = newItems.splice(currentIndex, 1)
    newItems.splice(newIndex, 0, removed)

    onItemsChange(
      newItems.map((item, index) => ({ ...item, order: index }))
    )
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    // 손잡이에서 시작한 드래그만 허용
    if (draggingItemId !== id) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggingItemId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (sourceId === targetId) return

    const sourceIndex = items.findIndex((item) => item.id === sourceId)
    const targetIndex = items.findIndex((item) => item.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return

    const newItems = [...items]
    const [removed] = newItems.splice(sourceIndex, 1)
    newItems.splice(targetIndex, 0, removed)

    onItemsChange(
      newItems.map((item, index) => ({ ...item, order: index }))
    )
    setDraggingItemId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">미디어 아이템</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddItem('video')}
            disabled={disabled}
            className="gap-1 text-gray-700 border-gray-300"
          >
            <Video size={16} className="text-purple-600" />
            영상 추가
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddItem('image')}
            disabled={disabled}
            className="gap-1 text-gray-700 border-gray-300"
          >
            <ImageIcon size={16} className="text-blue-600" />
            이미지 추가
          </Button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500 text-sm">
            영상이나 이미지를 추가하세요
          </p>
        </div>
      )}

      <div className="space-y-3">
        {items
          .sort((a, b) => a.order - b.order)
          .map((item, index) => (
            <div
              key={item.id}
              draggable={!disabled && draggingItemId === item.id}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, item.id)}
              className={`border rounded-lg transition-colors ${
                selectedItemId === item.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={() => onItemSelect?.(item.id)}
              >
                <div
                  onMouseDown={() => !disabled && setDraggingItemId(item.id)}
                  onTouchStart={() => !disabled && setDraggingItemId(item.id)}
                  className="flex-shrink-0"
                >
                  <GripVertical
                    size={16}
                    className="text-gray-400 cursor-grab"
                  />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.type === 'video' ? (
                    <Video size={16} className="text-purple-500 flex-shrink-0" />
                  ) : (
                    <ImageIcon size={16} className="text-blue-500 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {item.type === 'video' ? '영상' : '이미지'} {index + 1}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    item.mode === 'tracking'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.mode === 'tracking' ? '트래킹' : '기본'}
                  </span>
                  {item.file && (
                    <span className="text-xs text-gray-400 truncate">
                      {item.file.name}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveItem(item.id)
                  }}
                  disabled={disabled}
                  className="h-8 w-8 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              {selectedItemId === item.id && (
                <div className="px-3 pb-5 border-t border-gray-100 mt-2 pt-3">
                  <MediaItemEditor
                    item={item}
                    onChange={(updates) => handleItemChange(item.id, updates)}
                    disabled={disabled}
                    canMoveUp={index > 0}
                    canMoveDown={index < items.length - 1}
                    onMoveUp={() => handleMoveItem(item.id, 'up')}
                    onMoveDown={() => handleMoveItem(item.id, 'down')}
                  />
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
