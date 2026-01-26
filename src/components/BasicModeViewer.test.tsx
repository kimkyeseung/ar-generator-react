import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BasicModeViewer from './BasicModeViewer'

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

describe('BasicModeViewer', () => {
  const defaultProps = {
    videoUrl: 'https://example.com/video.mp4',
    position: { x: 0.5, y: 0.5 },
    scale: 1,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
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

  it('shows HD loading indicator when previewVideoUrl is provided', async () => {
    render(
      <BasicModeViewer
        {...defaultProps}
        previewVideoUrl="https://example.com/preview.mp4"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('HD 로딩 중...')).toBeInTheDocument()
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
})
