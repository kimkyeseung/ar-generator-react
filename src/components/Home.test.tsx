// Mock modules before any imports
jest.mock('mind-ar/dist/mindar-image.prod.js', () => ({}), { virtual: true })

// Mock react-router-dom
const mockNavigate = jest.fn()
jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
)

// Mock useImageCompiler hook
const mockCompile = jest.fn()
jest.mock('../hooks/useImageCompiler', () => ({
  useImageCompiler: () => ({
    compile: mockCompile,
    isCompiling: false,
    progress: 0,
    reset: jest.fn(),
  }),
}))

// Mock URL APIs
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import Home from './Home'

describe('Home', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCompile.mockResolvedValue({
      targetBuffer: new ArrayBuffer(8),
      originalImage: new File(['test'], 'test.png', { type: 'image/png' }),
    })
  })

  describe('initial state', () => {
    it('should render without crashing', () => {
      const { container } = render(<Home />)
      expect(container).toBeTruthy()
    })

    it('should show step 1 message initially', () => {
      render(<Home />)
      expect(
        screen.getByText('Step 1. 타겟 이미지를 업로드해주세요.')
      ).toBeInTheDocument()
    })

    it('should show upload prompt status initially', () => {
      render(<Home />)
      expect(screen.getByText('파일을 업로드해주세요')).toBeInTheDocument()
    })

    it('should show AR settings section', () => {
      render(<Home />)
      expect(screen.getByText('AR 설정')).toBeInTheDocument()
    })

    it('should show highPrecision option in AR settings', () => {
      render(<Home />)
      expect(screen.getByText('추적 정확도 향상')).toBeInTheDocument()
    })

    it('should show target image upload section', () => {
      render(<Home />)
      expect(screen.getByText('Target Image')).toBeInTheDocument()
    })
  })

  describe('highPrecision option', () => {
    it('should toggle highPrecision checkbox', () => {
      render(<Home />)

      const highPrecisionCheckbox = screen.getByLabelText('추적 정확도 향상')
      expect(highPrecisionCheckbox).not.toBeChecked()

      fireEvent.click(highPrecisionCheckbox)
      expect(highPrecisionCheckbox).toBeChecked()

      fireEvent.click(highPrecisionCheckbox)
      expect(highPrecisionCheckbox).not.toBeChecked()
    })

    it('should show description text for highPrecision option', () => {
      render(<Home />)

      expect(
        screen.getByText(/더 정밀한 추적과 부드러운 AR 표시/)
      ).toBeInTheDocument()
    })
  })

  describe('step progression', () => {
    it('should show step 2 after target image is selected', async () => {
      render(<Home />)

      // Find the file input and simulate file selection
      const input = document.querySelector(
        'input[type="file"][accept="image/*"]'
      ) as HTMLInputElement
      expect(input).toBeTruthy()

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(input)
      })

      expect(
        screen.getByText('Step 2. 타겟에 재생될 영상을 업로드해주세요')
      ).toBeInTheDocument()
    })
  })

  describe('flatView functionality', () => {
    it('should show flatView checkbox after target is selected', async () => {
      render(<Home />)

      // Select target image
      const input = document.querySelector(
        'input[type="file"][accept="image/*"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(input)
      })

      expect(screen.getByText('항상 정면으로 표시')).toBeInTheDocument()
    })

    it('should toggle flatView checkbox', async () => {
      render(<Home />)

      // Select target image
      const input = document.querySelector(
        'input[type="file"][accept="image/*"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(input)
      })

      const flatViewCheckbox = screen.getByLabelText('항상 정면으로 표시')
      expect(flatViewCheckbox).not.toBeChecked()

      fireEvent.click(flatViewCheckbox)
      expect(flatViewCheckbox).toBeChecked()

      fireEvent.click(flatViewCheckbox)
      expect(flatViewCheckbox).not.toBeChecked()
    })

    it('should have flatView description text', async () => {
      render(<Home />)

      const input = document.querySelector(
        'input[type="file"][accept="image/*"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(input)
      })

      expect(
        screen.getByText(/타겟 이미지의 기울기에 상관없이/)
      ).toBeInTheDocument()
    })
  })

  describe('chromaKey functionality', () => {
    it('should show chromaKey checkbox after target is selected', async () => {
      render(<Home />)

      const input = document.querySelector(
        'input[type="file"][accept="image/*"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(input)
      })

      expect(screen.getByText('크로마키 적용')).toBeInTheDocument()
    })

    it('should show color input when chromaKey is enabled', async () => {
      render(<Home />)

      const input = document.querySelector(
        'input[type="file"][accept="image/*"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(input)
      })

      const chromaKeyCheckbox = screen.getByLabelText('크로마키 적용')
      fireEvent.click(chromaKeyCheckbox)

      expect(screen.getByText('크로마키 색상')).toBeInTheDocument()
    })
  })

  describe('publish button', () => {
    it('should have disabled publish button initially', () => {
      render(<Home />)

      const publishButton = screen.getByText('Publish')
      expect(publishButton).toBeDisabled()
    })

    it('should enable publish button after target and video are selected', async () => {
      render(<Home />)

      // Select target image
      const imageInput = document.querySelector(
        'input[type="file"][accept="image/*"]'
      ) as HTMLInputElement
      const imageFile = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(imageInput, 'files', {
        value: [imageFile],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(imageInput)
      })

      // Select video
      const videoInput = document.querySelector(
        'input[type="file"][accept="video/*"]'
      ) as HTMLInputElement
      expect(videoInput).toBeTruthy()

      const videoFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      Object.defineProperty(videoInput, 'files', {
        value: [videoFile],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(videoInput)
      })

      await waitFor(() => {
        const publishButton = screen.getByText('Publish')
        expect(publishButton).not.toBeDisabled()
      })
    })
  })

  describe('new publish flow', () => {
    it('should not compile until publish is clicked', async () => {
      render(<Home />)

      // Select target image
      const input = document.querySelector(
        'input[type="file"][accept="image/*"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(input)
      })

      // Compile should not have been called yet
      expect(mockCompile).not.toHaveBeenCalled()
    })

    it('should show step 3 after video is selected', async () => {
      render(<Home />)

      // Select target image
      const imageInput = document.querySelector(
        'input[type="file"][accept="image/*"]'
      ) as HTMLInputElement
      const imageFile = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(imageInput, 'files', {
        value: [imageFile],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(imageInput)
      })

      // Select video
      const videoInput = document.querySelector(
        'input[type="file"][accept="video/*"]'
      ) as HTMLInputElement
      const videoFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })
      Object.defineProperty(videoInput, 'files', {
        value: [videoFile],
        configurable: true,
      })

      await act(async () => {
        fireEvent.change(videoInput)
      })

      await waitFor(() => {
        expect(
          screen.getByText('Step 3. 배포 버튼을 클릭하세요.')
        ).toBeInTheDocument()
      })
    })
  })
})

describe('VideoUploadSection props interface', () => {
  it('should have correct props without highPrecision', () => {
    const VideoUploadSection = require('./home/VideoUploadSection').default

    const mockProps = {
      isTargetReady: true,
      videoFile: null,
      onFileSelect: jest.fn(),
      limitMb: 32,
      videoError: null,
      useChromaKey: false,
      onUseChromaKeyChange: jest.fn(),
      chromaKeyColor: '#00FF00',
      onChromaKeyColorChange: jest.fn(),
      chromaKeyError: null,
      flatView: false,
      onFlatViewChange: jest.fn(),
    }

    // Should not throw when all required props are provided
    const { container } = render(<VideoUploadSection {...mockProps} />)
    expect(container).toBeTruthy()
  })

  it('should call onFlatViewChange when flatView checkbox is clicked', () => {
    const VideoUploadSection = require('./home/VideoUploadSection').default
    const mockOnFlatViewChange = jest.fn()

    const mockProps = {
      isTargetReady: true,
      videoFile: null,
      onFileSelect: jest.fn(),
      limitMb: 32,
      videoError: null,
      useChromaKey: false,
      onUseChromaKeyChange: jest.fn(),
      chromaKeyColor: '#00FF00',
      onChromaKeyColorChange: jest.fn(),
      chromaKeyError: null,
      flatView: false,
      onFlatViewChange: mockOnFlatViewChange,
    }

    render(<VideoUploadSection {...mockProps} />)

    const flatViewCheckbox = screen.getByLabelText('항상 정면으로 표시')
    fireEvent.click(flatViewCheckbox)

    expect(mockOnFlatViewChange).toHaveBeenCalledWith(true)
  })

  it('should render with flatView=true', () => {
    const VideoUploadSection = require('./home/VideoUploadSection').default

    const mockProps = {
      isTargetReady: true,
      videoFile: null,
      onFileSelect: jest.fn(),
      limitMb: 32,
      videoError: null,
      useChromaKey: false,
      onUseChromaKeyChange: jest.fn(),
      chromaKeyColor: '#00FF00',
      onChromaKeyColorChange: jest.fn(),
      chromaKeyError: null,
      flatView: true,
      onFlatViewChange: jest.fn(),
    }

    render(<VideoUploadSection {...mockProps} />)

    const flatViewCheckbox = screen.getByLabelText('항상 정면으로 표시')
    expect(flatViewCheckbox).toBeChecked()
  })
})
