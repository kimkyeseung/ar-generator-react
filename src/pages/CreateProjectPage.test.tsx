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

// Mock @tanstack/react-query
const mockQueryClient = {
  invalidateQueries: jest.fn().mockResolvedValue(undefined),
}
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
}))

// Mock ThumbnailUpload component to avoid Image loading issues
jest.mock('../components/ThumbnailUpload', () => {
  return function MockThumbnailUpload({ file, onFileSelect, disabled }: any) {
    return (
      <div data-testid="thumbnail-upload">
        <input
          type="file"
          accept="image/*"
          data-testid="thumbnail-input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFileSelect(f)
          }}
          disabled={disabled}
        />
        {file && <span>Thumbnail: {file.name}</span>}
      </div>
    )
  }
})

// Mock GuideImageUpload component to avoid Image loading issues
jest.mock('../components/GuideImageUpload', () => {
  return function MockGuideImageUpload({ file, onFileSelect, disabled }: any) {
    return (
      <div data-testid="guide-image-upload">
        <input
          type="file"
          accept="image/*"
          data-testid="guide-image-input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFileSelect(f)
          }}
          disabled={disabled}
        />
        {file && <span>Guide: {file.name}</span>}
      </div>
    )
  }
})

// Mock UnifiedPreviewCanvas to avoid canvas/Image issues
jest.mock('../components/preview/UnifiedPreviewCanvas', () => {
  return function MockUnifiedPreviewCanvas() {
    return <div data-testid="unified-preview-canvas">Preview Canvas</div>
  }
})

// Mock URL APIs
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock navigator.mediaDevices.getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockRejectedValue(new Error('Camera not available in test')),
  },
})

// Mock HTMLMediaElement.prototype.load
Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  configurable: true,
  value: jest.fn(),
})

// Suppress image/canvas/media loading errors in jsdom
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      args[0]?.includes?.('Error loading image') ||
      args[0]?.includes?.('canvas') ||
      args[0]?.includes?.('img') ||
      args[0]?.includes?.('Camera') ||
      args[0]?.includes?.('Not implemented') ||
      args[0]?.includes?.('HTMLMediaElement') ||
      args[0]?.includes?.('ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

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
      // 초기 상태: 미디어 아이템이 없으므로 영상/이미지 추가 안내
      expect(
        screen.getByText('Step 1. 영상이나 이미지를 추가해주세요.')
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

    it('should show target image section with no tracking items message', () => {
      render(<CreateProjectPage />)
      // 초기 상태: 트래킹 아이템이 없으므로 타겟 이미지 불필요 메시지 표시
      expect(screen.getByText('현재는 타겟 이미지가 필요없습니다.')).toBeInTheDocument()
    })

    it('should show target image section', () => {
      render(<CreateProjectPage />)
      expect(screen.getByText('타겟 이미지')).toBeInTheDocument()
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
    it('should not show highPrecision checkbox initially (no tracking items)', () => {
      render(<CreateProjectPage />)

      // 트래킹 아이템이 없으면 AR 설정이 표시되지 않음
      expect(screen.queryByText('추적 정확도 향상')).not.toBeInTheDocument()
    })

    it('should show highPrecision checkbox after adding tracking media item', async () => {
      render(<CreateProjectPage />)

      // 영상 추가 버튼 클릭 (기본값: 트래킹 모드)
      const addVideoButton = screen.getByText('영상 추가하기')
      await act(async () => {
        fireEvent.click(addVideoButton)
      })

      // 이제 AR 설정이 표시됨
      await waitFor(() => {
        expect(screen.getByText('추적 정확도 향상')).toBeInTheDocument()
      })
    })
  })

  describe('Step Progression', () => {
    it('should show step 1 for target image after adding tracking video', async () => {
      render(<CreateProjectPage />)

      // 영상 추가 버튼 클릭 (기본값: 트래킹 모드)
      const addVideoButton = screen.getByText('영상 추가하기')
      await act(async () => {
        fireEvent.click(addVideoButton)
      })

      // 트래킹 아이템이 추가되었으므로 타겟 이미지 업로드 안내
      await waitFor(() => {
        expect(
          screen.getByText('Step 1. 타겟 이미지를 업로드해주세요.')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Media Item Addition', () => {
    it('should add video item when clicking add video button', async () => {
      render(<CreateProjectPage />)

      // 영상 추가 버튼 클릭
      const addVideoButton = screen.getByText('영상 추가하기')
      await act(async () => {
        fireEvent.click(addVideoButton)
      })

      // 영상 아이템 섹션이 추가되어야 함
      await waitFor(() => {
        expect(screen.getByText('영상 1')).toBeInTheDocument()
      })
    })

    it('should add image item when clicking add image button', async () => {
      render(<CreateProjectPage />)

      // 이미지 추가 버튼 클릭
      const addImageButton = screen.getByText('이미지 추가하기')
      await act(async () => {
        fireEvent.click(addImageButton)
      })

      // 이미지 아이템 섹션이 추가되어야 함
      await waitFor(() => {
        expect(screen.getByText('이미지 1')).toBeInTheDocument()
      })
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

describe('New Publish Flow (Compile + Upload)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCompile.mockResolvedValue({
      targetBuffer: new ArrayBuffer(8),
      originalImage: new File(['test'], 'test.png', { type: 'image/png' }),
    })
  })

  it('should not compile before publish button is clicked', async () => {
    render(<CreateProjectPage />)

    // 영상 추가 (기본값: 트래킹 모드)
    const addVideoButton = screen.getByText('영상 추가하기')
    await act(async () => {
      fireEvent.click(addVideoButton)
    })

    // Verify compile has not been called yet (deferred to publish)
    expect(mockCompile).not.toHaveBeenCalled()
  })

  it('should show AR options section when tracking items exist', async () => {
    render(<CreateProjectPage />)

    // 초기 상태: 트래킹 아이템 없음 -> AR 설정 숨김
    expect(screen.queryByText('추적 정확도 향상')).not.toBeInTheDocument()

    // 영상 추가 (기본값: 트래킹 모드)
    const addVideoButton = screen.getByText('영상 추가하기')
    await act(async () => {
      fireEvent.click(addVideoButton)
    })

    // 트래킹 아이템 추가 후 AR 설정 표시
    await waitFor(() => {
      expect(screen.getByText('추적 정확도 향상')).toBeInTheDocument()
    })
  })
})
