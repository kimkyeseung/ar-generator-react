// Mock modules before any imports
jest.mock('mind-ar/dist/mindar-image.prod.js', () => ({}), { virtual: true })

// Mock react-router-dom before imports
const mockNavigate = jest.fn()
jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'test-project-id' }),
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
const mockCompressVideo = jest.fn()
const mockResetProgress = jest.fn()
jest.mock('../hooks/useVideoCompressor', () => ({
  useVideoCompressor: () => ({
    compressVideo: mockCompressVideo,
    compressionProgress: null,
    resetProgress: mockResetProgress,
  }),
}))

// Mock @tanstack/react-query
const mockQueryClient = {
  invalidateQueries: jest.fn().mockResolvedValue(undefined),
}
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
}))

// Mock URL APIs
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

// Set up environment before fetch mock
process.env.REACT_APP_API_URL = 'http://localhost:4000'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

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
      args[0]?.includes?.('HTMLMediaElement')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EditProjectPage from './EditProjectPage'
import { Project, MediaItemResponse } from '../types/project'

// Sample media item for testing
const mockMediaItem: MediaItemResponse = {
  id: 'media-1',
  projectId: 'test-project-id',
  type: 'video',
  mode: 'basic',
  fileId: 'video-123',
  previewFileId: 'preview-123',
  positionX: 0.5,
  positionY: 0.5,
  scale: 1,
  aspectRatio: 16 / 9,
  chromaKeyEnabled: false,
  chromaKeyColor: null,
  chromaKeySimilarity: null,
  chromaKeySmoothness: null,
  flatView: false,
  linkEnabled: false,
  linkUrl: null,
  order: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

// Sample project data with media items
const mockProjectWithMedia: Project = {
  id: 'test-project-id',
  folderId: 'test-folder-id',
  title: '테스트 프로젝트',
  description: null,
  width: 1,
  height: 1.5,
  videoFileId: 'video-123',
  previewVideoFileId: 'preview-123',
  targetFileId: null,
  targetImageFileId: null,
  thumbnailBase64: null,
  guideImageFileId: null,
  chromaKeyColor: null,
  chromaKeySimilarity: null,
  chromaKeySmoothness: null,
  flatView: false,
  highPrecision: false,
  cameraResolution: 'fhd',
  videoQuality: 'low',
  videoPosition: { x: 0.5, y: 0.5 },
  videoScale: 1,
  mediaItems: [mockMediaItem],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

// Sample project data without media items
const mockEmptyProject: Project = {
  ...mockProjectWithMedia,
  mediaItems: [],
}

describe('EditProjectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCompile.mockResolvedValue({
      targetBuffer: new ArrayBuffer(8),
      originalImage: new File(['test'], 'test.png', { type: 'image/png' }),
    })
    mockCompressVideo.mockResolvedValue({
      previewFile: new File(['preview'], 'preview.mp4', { type: 'video/mp4' }),
      originalFile: new File(['original'], 'original.mp4', { type: 'video/mp4' }),
    })
    // Default fetch mock for loading project
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/projects/test-project-id')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProjectWithMedia),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
  })

  describe('Initial Loading', () => {
    it('should show loading spinner initially', async () => {
      const { container } = render(<EditProjectPage />)
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()

      // Wait for loading to complete to prevent act warnings
      await waitFor(() => {
        expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
      })
    })

    it('should load project data on mount', async () => {
      render(<EditProjectPage />)

      // Wait for loading to complete and check fetch was called
      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('프로젝트 제목을 입력하세요')
        expect(titleInput).toHaveValue('테스트 프로젝트')
      })

      // Verify fetch was called with correct path
      const fetchCalls = mockFetch.mock.calls.map((call: any) => call[0])
      const projectFetchCall = fetchCalls.find((url: string) => url.includes('/projects/test-project-id'))
      expect(projectFetchCall).toBeTruthy()
    })

    it('should display project title after loading', async () => {
      render(<EditProjectPage />)

      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('프로젝트 제목을 입력하세요')
        expect(titleInput).toHaveValue('테스트 프로젝트')
      })
    })

    it('should show error message when project fails to load', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        })
      )

      render(<EditProjectPage />)

      await waitFor(() => {
        expect(screen.getByText(/프로젝트를 불러오지 못했습니다/)).toBeInTheDocument()
      })
    })
  })

  describe('Video Quality Selection', () => {
    it('should show video quality selector when media items exist', async () => {
      render(<EditProjectPage />)

      await waitFor(() => {
        // VideoQualitySelector should be visible when mediaItems.length > 0
        expect(screen.getByText('영상 품질')).toBeInTheDocument()
      })
    })

    it('should not show video quality selector when no media items', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEmptyProject),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        expect(screen.getByText('프로젝트 편집')).toBeInTheDocument()
      })

      // VideoQualitySelector should NOT be visible
      expect(screen.queryByText('영상 품질')).not.toBeInTheDocument()
    })

    it('should load video quality from project data', async () => {
      const projectWithMediumQuality = {
        ...mockProjectWithMedia,
        videoQuality: 'medium' as const,
      }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(projectWithMediumQuality),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        const mediumQualityButton = screen.getByRole('button', { name: /중간화질 선택/i })
        expect(mediumQualityButton).toHaveAttribute('aria-pressed', 'true')
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate to list when clicking back button', async () => {
      render(<EditProjectPage />)

      await waitFor(() => {
        expect(screen.getByText('← 목록으로')).toBeInTheDocument()
      })

      const backButton = screen.getByText('← 목록으로')
      fireEvent.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('should navigate to list when clicking cancel button', async () => {
      render(<EditProjectPage />)

      await waitFor(() => {
        expect(screen.getByText('취소')).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('취소')
      fireEvent.click(cancelButton)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('Password Modal', () => {
    it('should open password modal when save is clicked', async () => {
      render(<EditProjectPage />)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: '저장' })
        expect(saveButton).not.toBeDisabled()
      })

      const saveButton = screen.getByRole('button', { name: '저장' })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('비밀번호 입력')).toBeInTheDocument()
      })
    })
  })

  describe('Media Items', () => {
    it('should display loaded media items', async () => {
      render(<EditProjectPage />)

      await waitFor(() => {
        // Media item should be displayed (영상 1)
        expect(screen.getByText(/영상 1/)).toBeInTheDocument()
      })
    })

    it('should show mode badge for media item', async () => {
      render(<EditProjectPage />)

      // First wait for the media item to be displayed
      await waitFor(() => {
        expect(screen.getByText(/영상 1/)).toBeInTheDocument()
      })

      // Then check for mode badge - there may be multiple matches, use getAllByText
      const basicModeElements = screen.getAllByText(/기본/)
      expect(basicModeElements.length).toBeGreaterThan(0)
    })
  })
})
