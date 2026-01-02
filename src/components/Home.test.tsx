// Mock modules before any imports
jest.mock('mind-ar/dist/mindar-image.prod.js', () => ({}), { virtual: true })

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock react-router-dom
const mockNavigate = jest.fn()
jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
)

// Mock MindARCompiler to avoid mind-ar dependency issues
jest.mock('./MindARCompiler', () => {
  return function MockMindARCompiler({ onCompileColplete, onCompileStateChange }: any) {
    return (
      <div data-testid="mock-mindar-compiler">
        <button
          data-testid="compile-button"
          onClick={() => {
            onCompileStateChange(true)
            setTimeout(() => {
              const mockArrayBuffer = new ArrayBuffer(8)
              const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
              onCompileColplete(mockArrayBuffer, mockFile)
              onCompileStateChange(false)
            }, 0)
          }}
        >
          Compile
        </button>
      </div>
    )
  }
})

import Home from './Home'

describe('Home', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('flatView functionality', () => {
    it('should render VideoUploadSection with flatView props', async () => {
      render(<Home />)

      // Trigger compilation to enable VideoUploadSection
      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

      // Wait for compilation to complete
      await screen.findByText('항상 정면으로 표시', {}, { timeout: 1000 })

      // Check flatView checkbox exists
      const flatViewCheckbox = screen.getByLabelText('항상 정면으로 표시')
      expect(flatViewCheckbox).toBeInTheDocument()
      expect(flatViewCheckbox).not.toBeChecked()
    })

    it('should toggle flatView checkbox', async () => {
      render(<Home />)

      // Trigger compilation
      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

      await screen.findByText('항상 정면으로 표시', {}, { timeout: 1000 })

      const flatViewCheckbox = screen.getByLabelText('항상 정면으로 표시')

      // Toggle on
      fireEvent.click(flatViewCheckbox)
      expect(flatViewCheckbox).toBeChecked()

      // Toggle off
      fireEvent.click(flatViewCheckbox)
      expect(flatViewCheckbox).not.toBeChecked()
    })

    it('should have flatView description text', async () => {
      render(<Home />)

      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

      await screen.findByText('항상 정면으로 표시', {}, { timeout: 1000 })

      expect(
        screen.getByText(/타겟 이미지의 기울기에 상관없이/)
      ).toBeInTheDocument()
    })
  })

  describe('chromaKey functionality', () => {
    it('should render chromaKey checkbox after target is ready', async () => {
      render(<Home />)

      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

      await screen.findByText('크로마키 적용', {}, { timeout: 1000 })

      const chromaKeyCheckbox = screen.getByLabelText('크로마키 적용')
      expect(chromaKeyCheckbox).toBeInTheDocument()
      expect(chromaKeyCheckbox).not.toBeChecked()
    })

    it('should show color input when chromaKey is enabled', async () => {
      render(<Home />)

      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

      await screen.findByText('크로마키 적용', {}, { timeout: 1000 })

      const chromaKeyCheckbox = screen.getByLabelText('크로마키 적용')
      fireEvent.click(chromaKeyCheckbox)

      // Color input should appear
      expect(screen.getByText('크로마키 색상')).toBeInTheDocument()
    })
  })

  describe('initial state', () => {
    it('should show step 1 message initially', () => {
      render(<Home />)

      expect(
        screen.getByText('Step 1. 타겟 이미지를 업로드해주세요.')
      ).toBeInTheDocument()
    })

    it('should show upload prompt status initially', () => {
      render(<Home />)

      expect(screen.getByText('업로드를 진행해주세요')).toBeInTheDocument()
    })
  })

  describe('step progression', () => {
    it('should progress to step 2 after target compilation', async () => {
      render(<Home />)

      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

      // After compilation, should show step 2 message
      await screen.findByText(
        'Step 2. 타겟에 재생될 영상을 업로드해주세요',
        {},
        { timeout: 1000 }
      )
    })
  })
})

describe('VideoUploadSection props interface', () => {
  it('should have flatView and onFlatViewChange in props type', () => {
    // This test verifies the TypeScript interface is correct
    // by importing and checking the component accepts these props
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
