import * as React from 'react'
import { cn } from '../../lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  onToggle?: (isOpen: boolean) => void
}

const ANIMATION_DURATION = 300

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
  icon,
  badge,
  onToggle,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  const handleToggle = () => {
    const newState = !isOpen

    if (wrapperRef.current && contentRef.current) {
      setIsAnimating(true)

      if (newState) {
        // Opening: animate from 0 to scrollHeight
        wrapperRef.current.style.maxHeight = '0px'
        requestAnimationFrame(() => {
          if (wrapperRef.current && contentRef.current) {
            wrapperRef.current.style.maxHeight = `${contentRef.current.scrollHeight}px`
          }
        })
      } else {
        // Closing: set current height first, then animate to 0
        wrapperRef.current.style.maxHeight = `${contentRef.current.scrollHeight}px`
        requestAnimationFrame(() => {
          if (wrapperRef.current) {
            wrapperRef.current.style.maxHeight = '0px'
          }
        })
      }

      // Use setTimeout instead of onTransitionEnd for reliability
      setTimeout(() => {
        setIsAnimating(false)
        if (newState && wrapperRef.current) {
          // After opening animation, remove max-height constraint
          wrapperRef.current.style.maxHeight = 'none'
        }
      }, ANIMATION_DURATION + 50) // Add small buffer
    }

    setIsOpen(newState)
    onToggle?.(newState)
  }

  // Set initial state based on defaultOpen
  React.useEffect(() => {
    if (wrapperRef.current) {
      if (defaultOpen) {
        wrapperRef.current.style.maxHeight = 'none'
      } else {
        wrapperRef.current.style.maxHeight = '0px'
      }
    }
  }, [defaultOpen])

  // Ensure max-height is none when open and not animating
  React.useEffect(() => {
    if (isOpen && !isAnimating && wrapperRef.current) {
      wrapperRef.current.style.maxHeight = 'none'
    }
  }, [isOpen, isAnimating])

  return (
    <div className={cn('border border-gray-200 rounded-lg overflow-hidden', className)}>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left',
          headerClassName
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-500">{icon}</span>}
          <span className="font-medium text-gray-900">{title}</span>
          {badge && <span>{badge}</span>}
        </div>
        <span className="text-gray-500">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>

      <div
        ref={wrapperRef}
        className={cn(
          // Only use overflow-hidden during animation or when closed
          (isAnimating || !isOpen) && 'overflow-hidden',
          isAnimating && 'transition-[max-height] duration-300 ease-in-out'
        )}
      >
        <div
          ref={contentRef}
          className={cn('p-4 pb-6', contentClassName)}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
