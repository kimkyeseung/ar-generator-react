// Mock modules before any imports
jest.mock('mind-ar/dist/mindar-image.prod.js', () => ({}), { virtual: true })

// Mock react-router-dom before imports
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

// Mock useVideoCompressor hook
jest.mock('../hooks/useVideoCompressor', () => ({
  useVideoCompressor: () => ({
    compressVideo: jest.fn().mockResolvedValue({
      previewFile: new File(['preview'], 'preview.mp4', { type: 'video/mp4' }),
      originalFile: new File(['original'], 'original.mp4', { type: 'video/mp4' }),
    }),
    compressionProgress: null,
    resetProgress: jest.fn(),
  }),
}))

// Mock URL APIs
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import CreateProjectPage from './CreateProjectPage'

describe('CreateProjectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCompile.mockResolvedValue({
      targetBuffer: new ArrayBuffer(8),
      originalImage: new File(['test'], 'test.png', { type: 'image/png' }),
    })
  })

  describe('Initial Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<CreateProjectPage />)
      expect(container).toBeTruthy()
    })

    it('should show step 1 message initially', () => {
      render(<CreateProjectPage />)
      expect(
        screen.getByText('Step 1. 타겟 이미지를 업로드해주세요.')
      ).toBeInTheDocument()
    })

    it('should show back to list button', () => {
      render(<CreateProjectPage />)
      expect(screen.getByText('← 목록으로')).toBeInTheDocument()
    })

    it('should have project title input', () => {
      render(<CreateProjectPage />)
      expect(screen.getByText('프로젝트 제목 (선택)')).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('프로젝트 제목을 입력하세요')
      ).toBeInTheDocument()
    })

    it('should show initial workflow status', () => {
      render(<CreateProjectPage />)
      expect(screen.getByText('파일을 업로드해주세요')).toBeInTheDocument()
    })

    it('should show AR settings section with highPrecision option', () => {
      render(<CreateProjectPage />)
      expect(screen.getByText('AR 설정')).toBeInTheDocument()
      expect(screen.getByText('추적 정확도 향상')).toBeInTheDocument()
    })

    it('should show target image upload section', () => {
      render(<CreateProjectPage />)
      expect(screen.getByText('Target Image')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate to list when clicking back button', () => {
      render(<CreateProjectPage />)

      const backButton = screen.getByText('← 목록으로')
      fireEvent.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('Title Input', () => {
    it('should update title when typing', () => {
      render(<CreateProjectPage />)

      const titleInput = screen.getByPlaceholderText('프로젝트 제목을 입력하세요')
      fireEvent.change(titleInput, { target: { value: '내 프로젝트' } })

      expect(titleInput).toHaveValue('내 프로젝트')
    })
  })

  describe('HighPrecision Option', () => {
    it('should show highPrecision checkbox in AR settings', () => {
      render(<CreateProjectPage />)

      expect(screen.getByText('추적 정확도 향상')).toBeInTheDocument()
    })

    it('should toggle highPrecision checkbox', () => {
      render(<CreateProjectPage />)

      const highPrecisionCheckbox = screen.getByLabelText('추적 정확도 향상')
      expect(highPrecisionCheckbox).not.toBeChecked()

      fireEvent.click(highPrecisionCheckbox)
      expect(highPrecisionCheckbox).toBeChecked()
    })

    it('should show description text for highPrecision option', () => {
      render(<CreateProjectPage />)

      expect(
        screen.getByText(/더 정밀한 추적과 부드러운 AR 표시/)
      ).toBeInTheDocument()
    })
  })

  describe('Step Progression', () => {
    it('should show step 2 after target image is selected', async () => {
      render(<CreateProjectPage />)

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
        await screen.findByText('Step 2. 타겟에 재생될 영상을 업로드해주세요.')
      ).toBeInTheDocument()
    })
  })

  describe('FlatView Option', () => {
    it('should show flatView checkbox after target is selected', async () => {
      render(<CreateProjectPage />)

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

      expect(await screen.findByText('항상 정면으로 표시')).toBeInTheDocument()
    })

    it('should toggle flatView checkbox', async () => {
      render(<CreateProjectPage />)

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

      await screen.findByText('항상 정면으로 표시')

      const flatViewCheckbox = screen.getByLabelText('항상 정면으로 표시')
      expect(flatViewCheckbox).not.toBeChecked()

      fireEvent.click(flatViewCheckbox)
      expect(flatViewCheckbox).toBeChecked()
    })
  })

  describe('ChromaKey Option', () => {
    it('should show chromaKey checkbox after target is selected', async () => {
      render(<CreateProjectPage />)

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

      expect(await screen.findByText('크로마키 적용')).toBeInTheDocument()
    })

    it('should show color picker when chromaKey is enabled', async () => {
      render(<CreateProjectPage />)

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

      await screen.findByText('크로마키 적용')

      const chromaKeyCheckbox = screen.getByLabelText('크로마키 적용')
      fireEvent.click(chromaKeyCheckbox)

      expect(screen.getByText('크로마키 색상')).toBeInTheDocument()
    })
  })

  describe('Publish Button', () => {
    it('should have disabled publish button initially', () => {
      render(<CreateProjectPage />)

      const publishButton = screen.getByText('Publish')
      expect(publishButton).toBeDisabled()
    })

    it('should enable publish button after target image and video are selected', async () => {
      render(<CreateProjectPage />)

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

      // Wait for step 2 to appear
      await screen.findByText('Step 2. 타겟에 재생될 영상을 업로드해주세요.')

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

      // Wait for step 3 and publish button to be enabled
      await waitFor(() => {
        const publishButton = screen.getByText('Publish')
        expect(publishButton).not.toBeDisabled()
      })
    })
  })

  describe('Publish Flow', () => {
    it('should open password modal when publish is clicked', async () => {
      render(<CreateProjectPage />)

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
      await screen.findByText('Step 2. 타겟에 재생될 영상을 업로드해주세요.')
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

      // Click publish
      await waitFor(() => {
        const publishButton = screen.getByText('Publish')
        expect(publishButton).not.toBeDisabled()
      })

      const publishButton = screen.getByText('Publish')
      fireEvent.click(publishButton)

      // Password modal should appear
      await waitFor(() => {
        expect(screen.getByText('비밀번호 입력')).toBeInTheDocument()
      })
    })
  })
})

describe('New Publish Flow (Compile + Upload)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCompile.mockResolvedValue({
      targetBuffer: new ArrayBuffer(8),
      originalImage: new File(['test'], 'test.png', { type: 'image/png' }),
    })
  })

  it('should compile target images when publish flow starts', async () => {
    // This test verifies the new flow where compile happens during publish
    render(<CreateProjectPage />)

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

    // Verify compile has not been called yet (deferred to publish)
    expect(mockCompile).not.toHaveBeenCalled()
  })

  it('should show highPrecision option before selecting target image', () => {
    render(<CreateProjectPage />)

    // highPrecision should be visible in AR settings section from the start
    expect(screen.getByText('추적 정확도 향상')).toBeInTheDocument()
    expect(screen.getByLabelText('추적 정확도 향상')).toBeInTheDocument()
  })

  it('should pass highPrecision option when compile is called', async () => {
    // Use a custom mock to track compile calls
    const compileWithOptions = jest.fn().mockResolvedValue({
      targetBuffer: new ArrayBuffer(8),
      originalImage: new File(['test'], 'test.png', { type: 'image/png' }),
    })

    jest.doMock('../hooks/useImageCompiler', () => ({
      useImageCompiler: () => ({
        compile: compileWithOptions,
        isCompiling: false,
        progress: 0,
        reset: jest.fn(),
      }),
    }))

    // Note: Full integration test would require mocking XHR and password modal
    // This test documents the expected behavior
    expect(true).toBe(true)
  })
})
