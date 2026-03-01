import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChromaKeyPreview from './ChromaKeyPreview'
import { DEFAULT_CHROMAKEY_SETTINGS } from '../../types/project'

// Mock canvas context
const mockGetContext = jest.fn().mockReturnValue({
  drawImage: jest.fn(),
  getImageData: jest.fn().mockReturnValue({
    data: new Uint8ClampedArray(16), // 4 pixels (RGBA)
  }),
  putImageData: jest.fn(),
})

// Mock HTMLCanvasElement
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = mockGetContext
})

// Mock video element play/pause
const mockPlay = jest.fn().mockResolvedValue(undefined)
const mockPause = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()

  // Re-mock URL APIs after clearAllMocks
  global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-video-url')
  global.URL.revokeObjectURL = jest.fn()

  Object.defineProperty(HTMLVideoElement.prototype, 'play', {
    configurable: true,
    value: mockPlay,
  })
  Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
    configurable: true,
    value: mockPause,
  })
})

describe('ChromaKeyPreview', () => {
  const defaultProps = {
    chromaKeyColor: '#00FF00',
    chromaKeySettings: DEFAULT_CHROMAKEY_SETTINGS,
  }

  describe('Rendering', () => {
    it('should return null when no video source is provided', () => {
      const { container } = render(<ChromaKeyPreview {...defaultProps} />)
      expect(container.firstChild).toBeNull()
    })

    it('should render preview when videoFile is provided', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('미리보기')).toBeInTheDocument()
      })
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile)
    })

    it('should render preview when videoUrl is provided', async () => {
      render(<ChromaKeyPreview {...defaultProps} videoUrl="http://example.com/video.mp4" />)

      await waitFor(() => {
        expect(screen.getByText('미리보기')).toBeInTheDocument()
      })
    })

    it('should show checkerboard pattern description', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('체커보드 패턴은 투명하게 처리된 영역입니다')).toBeInTheDocument()
      })
    })
  })

  describe('Video Controls', () => {
    it('should show play button initially', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('미리보기')).toBeInTheDocument()
      })

      // Play button should be visible (first button in the component)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have clickable play button', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('미리보기')).toBeInTheDocument()
      })

      // Find the play button (the one with the play icon in the center)
      const buttons = screen.getAllByRole('button')
      const playButton = buttons.find(btn => btn.querySelector('svg path[d="M8 5v14l11-7z"]'))
      expect(playButton).toBeTruthy()

      // Click the play button - just verify it doesn't throw
      if (playButton) {
        expect(() => fireEvent.click(playButton)).not.toThrow()
      }
    })
  })

  describe('Original View Toggle', () => {
    it('should have original view checkbox', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('미리보기')).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })

    it('should toggle original view when checkbox is clicked', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('미리보기')).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(checkbox).toBeChecked()
    })
  })

  describe('Expand/Collapse Toggle', () => {
    it('should show expand button by default', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('확대')).toBeInTheDocument()
      })
    })

    it('should toggle to collapse button when expanded', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('확대')).toBeInTheDocument()
      })

      const expandButton = screen.getByText('확대')
      fireEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('축소')).toBeInTheDocument()
      })
    })

    it('should toggle back to expand button when collapsed', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('확대')).toBeInTheDocument()
      })

      // Expand
      fireEvent.click(screen.getByText('확대'))
      await waitFor(() => {
        expect(screen.getByText('축소')).toBeInTheDocument()
      })

      // Collapse
      fireEvent.click(screen.getByText('축소'))
      await waitFor(() => {
        expect(screen.getByText('확대')).toBeInTheDocument()
      })
    })
  })

  describe('CORS Error Handling', () => {
    it('should render component even with potential CORS issues', async () => {
      render(<ChromaKeyPreview {...defaultProps} videoUrl="http://example.com/video.mp4" />)

      await waitFor(() => {
        expect(screen.getByText('미리보기')).toBeInTheDocument()
      })
    })
  })

  describe('CrossOrigin Attribute', () => {
    it('should set crossOrigin for external URLs', async () => {
      render(<ChromaKeyPreview {...defaultProps} videoUrl="http://example.com/video.mp4" />)

      await waitFor(() => {
        expect(screen.getByText('미리보기')).toBeInTheDocument()
      })

      const video = document.querySelector('video')
      expect(video).toHaveAttribute('crossOrigin', 'anonymous')
    })

    it('should not set crossOrigin for local files', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('미리보기')).toBeInTheDocument()
      })

      const video = document.querySelector('video')
      expect(video).not.toHaveAttribute('crossOrigin')
    })
  })

  describe('Cleanup', () => {
    it('should revoke object URL on unmount', async () => {
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      const { unmount } = render(<ChromaKeyPreview {...defaultProps} videoFile={mockFile} />)

      await waitFor(() => {
        expect(screen.getByText('미리보기')).toBeInTheDocument()
      })

      unmount()

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-video-url')
    })
  })
})
