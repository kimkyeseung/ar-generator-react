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

// Mock MindARCompiler
jest.mock('../components/MindARCompiler', () => {
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

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CreateProjectPage from './CreateProjectPage'

describe('CreateProjectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

      expect(screen.getByText('업로드를 진행해주세요')).toBeInTheDocument()
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

  describe('Step Progression', () => {
    it('should show step 2 after compilation', async () => {
      render(<CreateProjectPage />)

      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

      expect(
        await screen.findByText('Step 2. 타겟에 재생될 영상을 업로드해주세요')
      ).toBeInTheDocument()
    })
  })

  describe('FlatView Option', () => {
    it('should show flatView checkbox after target is ready', async () => {
      render(<CreateProjectPage />)

      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

      expect(
        await screen.findByText('항상 정면으로 표시')
      ).toBeInTheDocument()
    })

    it('should toggle flatView checkbox', async () => {
      render(<CreateProjectPage />)

      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

      await screen.findByText('항상 정면으로 표시')

      const flatViewCheckbox = screen.getByLabelText('항상 정면으로 표시')
      expect(flatViewCheckbox).not.toBeChecked()

      fireEvent.click(flatViewCheckbox)
      expect(flatViewCheckbox).toBeChecked()
    })
  })

  describe('ChromaKey Option', () => {
    it('should show chromaKey checkbox after target is ready', async () => {
      render(<CreateProjectPage />)

      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

      expect(
        await screen.findByText('크로마키 적용')
      ).toBeInTheDocument()
    })

    it('should show color picker when chromaKey is enabled', async () => {
      render(<CreateProjectPage />)

      const compileButton = screen.getByTestId('compile-button')
      fireEvent.click(compileButton)

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
  })
})
