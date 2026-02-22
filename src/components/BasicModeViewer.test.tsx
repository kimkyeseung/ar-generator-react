import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import BasicModeViewer from './BasicModeViewer'

// Mock SpeakerIcon to avoid image loading issues in jsdom
jest.mock('./ui/SpeakerIcon', () => ({
  SpeakerIcon: ({ muted }: { muted: boolean }) => (
    <span data-testid="speaker-icon">{muted ? '🔇' : '🔊'}</span>
  ),
}))

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn()
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
})

// Mock HTMLMediaElement
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: jest.fn().mockResolvedValue(undefined),
})

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: jest.fn(),
})

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  configurable: true,
  value: jest.fn(),
})

describe('BasicModeViewer', () => {
  const defaultProps = {
    videoUrl: 'https://example.com/video.mp4',
    position: { x: 0.5, y: 0.5 },
    scale: 1,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn(), getSettings: () => ({ width: 1920, height: 1080 }) }],
      getVideoTracks: () => [{ getSettings: () => ({ width: 1920, height: 1080 }) }],
    })
  })

  it('renders loading state initially', () => {
    render(<BasicModeViewer {...defaultProps} />)

    expect(screen.getByText('카메라 준비 중...')).toBeInTheDocument()
  })

  it('renders speaker toggle button', async () => {
    render(<BasicModeViewer {...defaultProps} />)

    await waitFor(() => {
      const speakerButton = screen.getByRole('button', { name: /소리/i })
      expect(speakerButton).toBeInTheDocument()
    })
  })

  it('shows camera error when camera access fails', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Camera access denied'))

    render(<BasicModeViewer {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('카메라 접근 권한이 필요합니다.')).toBeInTheDocument()
    })
  })

  it('toggles mute state when speaker button is clicked', async () => {
    render(<BasicModeViewer {...defaultProps} />)

    await waitFor(() => {
      const speakerButton = screen.getByRole('button', { name: /소리/i })
      fireEvent.click(speakerButton)
    })
  })

  it('should use original videoUrl (preview disabled)', async () => {
    // Note: 프리뷰 기능이 비활성화되어 항상 원본 URL 사용
    const { container } = render(
      <BasicModeViewer
        {...defaultProps}
        previewVideoUrl="https://example.com/preview.mp4"
      />
    )

    await waitFor(() => {
      // Should use original URL (preview is disabled in BasicModeViewer)
      const video = container.querySelector('video[src="https://example.com/video.mp4"]')
      expect(video).toBeInTheDocument()
    })
  })

  it('applies position and scale styles to video overlay', async () => {
    const { container } = render(
      <BasicModeViewer
        {...defaultProps}
        position={{ x: 0.3, y: 0.7 }}
        scale={1.5}
      />
    )

    await waitFor(() => {
      const overlay = container.querySelector('.pointer-events-none')
      expect(overlay).toHaveStyle({
        left: '30%',
        top: '70%',
      })
    })
  })

  it('applies correct sizing to video overlay matching VideoPositionEditor', async () => {
    // VideoPositionEditor와 동일한 크기 계산 로직 적용 확인
    // - 가로 영상 (aspectRatio >= 1): width: 50%
    // - 세로 영상 (aspectRatio < 1): width: 50% * aspectRatio
    // Note: jsdom에서 videoAspectRatio는 null이므로 기본값(50%) 적용
    const { container } = render(
      <BasicModeViewer
        {...defaultProps}
        position={{ x: 0.5, y: 0.5 }}
        scale={1}
      />
    )

    await waitFor(() => {
      const overlay = container.querySelector('.pointer-events-none')
      // videoAspectRatio가 null일 때 기본값 50% 적용
      expect(overlay).toHaveStyle({
        width: '50%',
      })
    })
  })

  it('renders video element with correct src', async () => {
    const { container } = render(<BasicModeViewer {...defaultProps} />)

    await waitFor(() => {
      const video = container.querySelector('video[src="https://example.com/video.mp4"]')
      expect(video).toBeInTheDocument()
    })
  })

  it('renders canvas when chromaKeyColor is provided', async () => {
    const { container } = render(
      <BasicModeViewer {...defaultProps} chromaKeyColor="#00FF00" />
    )

    await waitFor(() => {
      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('orientation change handling', () => {
    let addEventListenerSpy: jest.SpyInstance
    let removeEventListenerSpy: jest.SpyInstance

    beforeEach(() => {
      addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    })

    afterEach(() => {
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('should add orientationchange event listener on mount', async () => {
      render(<BasicModeViewer {...defaultProps} />)

      await waitFor(() => {
        const orientationChangeCalls = addEventListenerSpy.mock.calls.filter(
          (call) => call[0] === 'orientationchange'
        )
        expect(orientationChangeCalls.length).toBeGreaterThan(0)
      })
    })

    it('should remove orientationchange event listener on unmount', async () => {
      const { unmount } = render(<BasicModeViewer {...defaultProps} />)

      await waitFor(() => {
        // Wait for component to fully mount
        expect(screen.getByRole('button', { name: /소리/i })).toBeInTheDocument()
      })

      unmount()

      const orientationChangeCalls = removeEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'orientationchange'
      )
      expect(orientationChangeCalls.length).toBeGreaterThan(0)
    })

    it('should handle orientationchange event without errors', async () => {
      render(<BasicModeViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /소리/i })).toBeInTheDocument()
      })

      // Trigger orientationchange event
      expect(() => {
        window.dispatchEvent(new Event('orientationchange'))
      }).not.toThrow()
    })
  })

  describe('debug mode', () => {
    it('should show camera resolution in debug mode', async () => {
      render(<BasicModeViewer {...defaultProps} debugMode={true} />)

      await waitFor(() => {
        // Wait for camera to be ready (loading disappears)
        expect(screen.queryByText('카메라 준비 중...')).not.toBeInTheDocument()
      })

      // Check for camera resolution display
      const debugDisplay = screen.queryByText(/📷/)
      expect(debugDisplay).toBeInTheDocument()
    })

    it('should not show camera resolution in non-debug mode', async () => {
      render(<BasicModeViewer {...defaultProps} debugMode={false} />)

      await waitFor(() => {
        expect(screen.queryByText('카메라 준비 중...')).not.toBeInTheDocument()
      })

      // Camera resolution should not be shown
      const debugDisplay = screen.queryByText(/1920x1080/)
      expect(debugDisplay).not.toBeInTheDocument()
    })
  })
})
