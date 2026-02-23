import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BasicModeViewer from './BasicModeViewer'
import { ProcessedMediaItem } from '../MindARViewerPage'
import { DEFAULT_CHROMAKEY_SETTINGS } from '../types/project'

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

// Helper function to create a media item
const createMediaItem = (overrides: Partial<ProcessedMediaItem> = {}): ProcessedMediaItem => ({
  id: 'test-item-1',
  type: 'video',
  mode: 'basic',
  fileUrl: 'https://example.com/video.mp4',
  position: { x: 0.5, y: 0.5 },
  scale: 1,
  aspectRatio: 16 / 9,
  chromaKeyEnabled: false,
  chromaKeySettings: DEFAULT_CHROMAKEY_SETTINGS,
  flatView: false,
  linkEnabled: false,
  order: 0,
  ...overrides,
})

describe('BasicModeViewer', () => {
  const defaultProps = {
    mediaItems: [createMediaItem()],
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

  it('renders speaker toggle button when there are videos', async () => {
    render(<BasicModeViewer {...defaultProps} />)

    await waitFor(() => {
      const speakerButton = screen.getByRole('button', { name: /소리/i })
      expect(speakerButton).toBeInTheDocument()
    })
  })

  it('does not render speaker button when there are no videos', async () => {
    render(
      <BasicModeViewer
        mediaItems={[createMediaItem({ type: 'image' })]}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('카메라 준비 중...')).not.toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /소리/i })).not.toBeInTheDocument()
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

  it('applies position and scale styles to media items', async () => {
    const { container } = render(
      <BasicModeViewer
        mediaItems={[createMediaItem({ position: { x: 0.3, y: 0.7 }, scale: 1.5 })]}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('카메라 준비 중...')).not.toBeInTheDocument()
    })

    const mediaContainer = container.querySelector('.absolute[style*="left: 30%"]')
    expect(mediaContainer).toBeInTheDocument()
  })

  it('renders video element with correct src', async () => {
    const { container } = render(<BasicModeViewer {...defaultProps} />)

    await waitFor(() => {
      const video = container.querySelector('video[src="https://example.com/video.mp4"]')
      expect(video).toBeInTheDocument()
    })
  })

  it('renders multiple media items', async () => {
    const { container } = render(
      <BasicModeViewer
        mediaItems={[
          createMediaItem({ id: 'item-1', order: 0 }),
          createMediaItem({ id: 'item-2', order: 1, fileUrl: 'https://example.com/video2.mp4' }),
        ]}
      />
    )

    await waitFor(() => {
      const videos = container.querySelectorAll('video[crossorigin="anonymous"]')
      expect(videos.length).toBe(2)
    })
  })

  it('renders image items correctly', async () => {
    const { container } = render(
      <BasicModeViewer
        mediaItems={[
          createMediaItem({
            type: 'image',
            fileUrl: 'https://example.com/image.png',
          }),
        ]}
      />
    )

    await waitFor(() => {
      const image = container.querySelector('img[src="https://example.com/image.png"]')
      expect(image).toBeInTheDocument()
    })
  })

  it('renders ChromaKeyVideo when chromaKeyEnabled is true', async () => {
    const { container } = render(
      <BasicModeViewer
        mediaItems={[
          createMediaItem({
            chromaKeyEnabled: true,
            chromaKeyColor: '#00FF00',
          }),
        ]}
      />
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

      expect(() => {
        window.dispatchEvent(new Event('orientationchange'))
      }).not.toThrow()
    })
  })

  describe('debug mode', () => {
    it('should show camera resolution in debug mode', async () => {
      render(<BasicModeViewer {...defaultProps} debugMode={true} />)

      await waitFor(() => {
        expect(screen.queryByText('카메라 준비 중...')).not.toBeInTheDocument()
      })

      const debugDisplay = screen.queryByText(/📷/)
      expect(debugDisplay).toBeInTheDocument()
    })

    it('should not show camera resolution in non-debug mode', async () => {
      render(<BasicModeViewer {...defaultProps} debugMode={false} />)

      await waitFor(() => {
        expect(screen.queryByText('카메라 준비 중...')).not.toBeInTheDocument()
      })

      const debugDisplay = screen.queryByText(/1920x1080/)
      expect(debugDisplay).not.toBeInTheDocument()
    })

    it('should show media count in debug mode', async () => {
      render(
        <BasicModeViewer
          mediaItems={[
            createMediaItem({ id: 'item-1' }),
            createMediaItem({ id: 'item-2' }),
          ]}
          debugMode={true}
        />
      )

      await waitFor(() => {
        expect(screen.queryByText('카메라 준비 중...')).not.toBeInTheDocument()
      })

      const mediaCountDisplay = screen.queryByText(/📦 2개 미디어/)
      expect(mediaCountDisplay).toBeInTheDocument()
    })
  })

  describe('guide image', () => {
    it('should show guide image when videos are loading', async () => {
      const { container } = render(
        <BasicModeViewer
          mediaItems={[createMediaItem()]}
          guideImageUrl="https://example.com/guide.png"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText('카메라 준비 중...')).not.toBeInTheDocument()
      })

      const guideImage = container.querySelector('img[alt="안내문구"]')
      expect(guideImage).toBeInTheDocument()
    })
  })
})
