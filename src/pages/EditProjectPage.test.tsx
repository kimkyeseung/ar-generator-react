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
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import EditProjectPage from './EditProjectPage'
import { Project } from '../types/project'
import { API_URL } from '../config/api'

// Sample project data (basic mode to avoid image loading issues)
const mockBasicModeProject: Project = {
  id: 'test-project-id',
  folderId: 'test-folder-id',
  title: '테스트 프로젝트',
  description: null,
  mode: 'basic',
  width: 1,
  height: 1.5,
  videoFileId: 'video-123',
  previewVideoFileId: 'preview-123',
  targetFileId: null,
  targetImageFileId: null,
  thumbnailFileId: null,
  overlayImageFileId: null,
  overlayLinkUrl: null,
  chromaKeyColor: null,
  chromaKeySimilarity: null,
  chromaKeySmoothness: null,
  flatView: false,
  highPrecision: false,
  cameraResolution: 'fhd',
  videoQuality: 'low',
  videoPosition: { x: 0.5, y: 0.5 },
  videoScale: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
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
          json: () => Promise.resolve(mockBasicModeProject),
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

      // Verify fetch was called with correct path (env variable may be undefined in test)
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

  describe('Video Quality Detection', () => {
    it('should load video quality from DB when videoQuality field exists', async () => {
      const projectWithMediumQuality = { ...mockBasicModeProject, videoQuality: 'medium' }
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
        // Should load 'medium' quality from DB
        const mediumQualityButton = screen.getByRole('button', { name: /중간화질 선택/i })
        expect(mediumQualityButton).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('should detect initial video quality as "low" when previewVideoFileId exists but videoQuality is not set', async () => {
      // Simulate old project without videoQuality field
      const oldProject = { ...mockBasicModeProject, videoQuality: undefined }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(oldProject),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        // Should fallback to detecting 'low' since previewVideoFileId exists
        const lowQualityButton = screen.getByRole('button', { name: /저화질 선택/i })
        expect(lowQualityButton).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('should detect initial video quality as "high" when previewVideoFileId does not exist and videoQuality is not set', async () => {
      const projectWithoutPreview = { ...mockBasicModeProject, previewVideoFileId: undefined, videoQuality: undefined }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(projectWithoutPreview),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        const highQualityButton = screen.getByRole('button', { name: /고화질 선택/i })
        expect(highQualityButton).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('should preserve medium quality from DB (regression test for quality reset bug)', async () => {
      // This test ensures that when a user selected 'medium' quality,
      // it is correctly loaded when re-entering the edit page
      const projectWithMediumQuality = {
        ...mockBasicModeProject,
        videoQuality: 'medium',
        previewVideoFileId: 'preview-123', // Both medium and low have previewVideoFileId
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
        // Should correctly show 'medium' instead of defaulting to 'low'
        const mediumQualityButton = screen.getByRole('button', { name: /중간화질 선택/i })
        expect(mediumQualityButton).toHaveAttribute('aria-pressed', 'true')

        // 'low' should NOT be selected
        const lowQualityButton = screen.getByRole('button', { name: /저화질 선택/i })
        expect(lowQualityButton).toHaveAttribute('aria-pressed', 'false')
      })
    })
  })

  describe('Video Quality Change for Existing Videos', () => {
    it('should download and re-compress existing video when quality is changed', async () => {
      const videoBlob = new Blob(['video-content'], { type: 'video/mp4' })
      let videoDownloadCalled = false
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBasicModeProject),
          })
        }
        if (url.includes('/file/video-123')) {
          videoDownloadCalled = true
          return Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(videoBlob),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        const lowQualityButton = screen.getByRole('button', { name: /저화질 선택/i })
        expect(lowQualityButton).toHaveAttribute('aria-pressed', 'true')
      })

      // Change to high quality
      const highQualityButton = screen.getByRole('button', { name: /고화질 선택/i })
      await act(async () => {
        fireEvent.click(highQualityButton)
        // Give time for async operations
        await new Promise(r => setTimeout(r, 100))
      })

      // Should download existing video
      await waitFor(() => {
        expect(videoDownloadCalled).toBe(true)
      }, { timeout: 3000 })

      // Should compress with new quality
      await waitFor(() => {
        expect(mockCompressVideo).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should show downloading status when downloading existing video', async () => {
      // Create a delayed fetch for video download
      const videoBlob = new Blob(['video-content'], { type: 'video/mp4' })
      let resolveVideoFetch: ((value: any) => void) | undefined

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBasicModeProject),
          })
        }
        if (url.includes('/file/video-123')) {
          return new Promise((resolve) => {
            resolveVideoFetch = resolve
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        const lowQualityButton = screen.getByRole('button', { name: /저화질 선택/i })
        expect(lowQualityButton).toHaveAttribute('aria-pressed', 'true')
      })

      // Change to high quality
      const highQualityButton = screen.getByRole('button', { name: /고화질 선택/i })
      await act(async () => {
        fireEvent.click(highQualityButton)
      })

      // Should show downloading status
      await waitFor(() => {
        expect(screen.getByText('기존 영상 다운로드 중...')).toBeInTheDocument()
      })

      // Resolve the fetch
      await act(async () => {
        resolveVideoFetch?.({
          ok: true,
          blob: () => Promise.resolve(videoBlob),
        })
      })
    })

    it('should disable save button while downloading video', async () => {
      let resolveVideoFetch: ((value: any) => void) | undefined
      const videoBlob = new Blob(['video-content'], { type: 'video/mp4' })

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBasicModeProject),
          })
        }
        if (url.includes('/file/video-123')) {
          return new Promise((resolve) => {
            resolveVideoFetch = resolve
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: '저장' })
        expect(saveButton).not.toBeDisabled()
      })

      // Change to high quality to trigger download
      const highQualityButton = screen.getByRole('button', { name: /고화질 선택/i })
      await act(async () => {
        fireEvent.click(highQualityButton)
      })

      // Save button should be disabled during download and show "다운로드 중..."
      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: '다운로드 중...' })
        expect(downloadButton).toBeDisabled()
      })

      // Resolve the fetch
      await act(async () => {
        resolveVideoFetch?.({
          ok: true,
          blob: () => Promise.resolve(videoBlob),
        })
      })
    })

    it('should send clearPreviewVideo flag when changing from low to high quality', async () => {
      // Project with low quality and existing preview
      const projectWithLowQuality = {
        ...mockBasicModeProject,
        videoQuality: 'low',
        previewVideoFileId: 'preview-123',
      }

      let savedFormData: FormData | null = null
      const videoBlob = new Blob(['video-content'], { type: 'video/mp4' })

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes('/projects/test-project-id') && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(projectWithLowQuality),
          })
        }
        if (url.includes('/file/video-123')) {
          return Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(videoBlob),
          })
        }
        if (url.includes('/verify-password')) {
          return Promise.resolve({ ok: true })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      // Mock XMLHttpRequest to capture FormData
      const mockXHR = {
        open: jest.fn(),
        send: jest.fn((data: FormData) => {
          savedFormData = data
          // Simulate successful response
          mockXHR.status = 200
          mockXHR.response = { folderId: 'test-folder-id' } as any
          mockXHR.onload?.()
        }),
        setRequestHeader: jest.fn(),
        upload: { onprogress: null },
        onload: null as (() => void) | null,
        onerror: null,
        status: 0,
        response: null as any,
        responseType: '',
      }
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any

      render(<EditProjectPage />)

      // Wait for project to load
      await waitFor(() => {
        const lowQualityButton = screen.getByRole('button', { name: /저화질 선택/i })
        expect(lowQualityButton).toHaveAttribute('aria-pressed', 'true')
      })

      // Change to high quality
      const highQualityButton = screen.getByRole('button', { name: /고화질 선택/i })
      await act(async () => {
        fireEvent.click(highQualityButton)
        await new Promise(r => setTimeout(r, 200))
      })

      // Wait for compression to complete
      await waitFor(() => {
        expect(mockCompressVideo).toHaveBeenCalledWith(expect.any(File), 'high')
      }, { timeout: 3000 })

      // Click save button
      const saveButton = await screen.findByRole('button', { name: '저장' })
      await act(async () => {
        fireEvent.click(saveButton)
      })

      // Enter password and submit
      await waitFor(() => {
        expect(screen.getByText('비밀번호 입력')).toBeInTheDocument()
      })

      const passwordInput = screen.getByPlaceholderText('비밀번호를 입력하세요')
      const submitButton = screen.getByRole('button', { name: '확인' })

      await act(async () => {
        fireEvent.change(passwordInput, { target: { value: 'test-password' } })
        fireEvent.click(submitButton)
        await new Promise(r => setTimeout(r, 100))
      })

      // Verify clearPreviewVideo flag was sent
      await waitFor(() => {
        expect(savedFormData).not.toBeNull()
        expect(savedFormData?.get('clearPreviewVideo')).toBe('true')
        expect(savedFormData?.get('videoQuality')).toBe('high')
      }, { timeout: 3000 })
    })

    it('should not re-download video if already downloaded', async () => {
      const videoBlob = new Blob(['video-content'], { type: 'video/mp4' })
      let videoFetchCount = 0

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBasicModeProject),
          })
        }
        if (url.includes('/file/video-123')) {
          videoFetchCount++
          return Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(videoBlob),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        const lowQualityButton = screen.getByRole('button', { name: /저화질 선택/i })
        expect(lowQualityButton).toHaveAttribute('aria-pressed', 'true')
      })

      // First quality change - should download
      const highQualityButton = screen.getByRole('button', { name: /고화질 선택/i })
      await act(async () => {
        fireEvent.click(highQualityButton)
        await new Promise(r => setTimeout(r, 100))
      })

      await waitFor(() => {
        expect(videoFetchCount).toBe(1)
      }, { timeout: 3000 })

      // Wait for compression to complete
      await waitFor(() => {
        expect(mockCompressVideo).toHaveBeenCalled()
      }, { timeout: 3000 })

      // Second quality change - should NOT download again (already cached)
      const lowQualityButton = screen.getByRole('button', { name: /저화질 선택/i })
      await act(async () => {
        fireEvent.click(lowQualityButton)
        await new Promise(r => setTimeout(r, 100))
      })

      // Wait a bit to ensure no additional fetch
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Video fetch count should still be 1 (not incremented)
      expect(videoFetchCount).toBe(1)
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

  describe('Save Button States', () => {
    it('should disable save button with invalid chroma key color', async () => {
      render(<EditProjectPage />)

      await waitFor(() => {
        expect(screen.getByText('프로젝트 편집')).toBeInTheDocument()
      })

      // Enable chroma key
      const chromaKeyCheckbox = screen.getByLabelText('크로마키 적용')
      fireEvent.click(chromaKeyCheckbox)

      // Enter invalid color
      const colorInput = screen.getByPlaceholderText('#00FF00')
      fireEvent.change(colorInput, { target: { value: 'invalid' } })

      // Save button should be disabled
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: '저장' })
        expect(saveButton).toBeDisabled()
      })
    })
  })

  describe('Chroma Key Settings', () => {
    it('should load chroma key settings from project data', async () => {
      const projectWithChromaKey = {
        ...mockBasicModeProject,
        chromaKeyColor: '#00FF00',
        chromaKeySimilarity: 0.5,
        chromaKeySmoothness: 0.15,
      }

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(projectWithChromaKey),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        // Chroma key should be enabled
        const chromaKeyCheckbox = screen.getByLabelText('크로마키 적용')
        expect(chromaKeyCheckbox).toBeChecked()
      })

      // Check color value
      const colorInput = screen.getByPlaceholderText('#00FF00')
      expect(colorInput).toHaveValue('#00FF00')

      // Check similarity slider value (0.5 = 50%)
      const similaritySlider = screen.getByLabelText('색상 범위')
      expect(similaritySlider).toHaveValue('0.5')

      // Check smoothness slider value (0.15)
      const smoothnessSlider = screen.getByLabelText('경계 부드러움')
      expect(smoothnessSlider).toHaveValue('0.15')
    })

    it('should use default values when chroma key settings are null', async () => {
      const projectWithChromaKeyNoSettings = {
        ...mockBasicModeProject,
        chromaKeyColor: '#FF0000',
        chromaKeySimilarity: null,
        chromaKeySmoothness: null,
      }

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(projectWithChromaKeyNoSettings),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        const chromaKeyCheckbox = screen.getByLabelText('크로마키 적용')
        expect(chromaKeyCheckbox).toBeChecked()
      })

      // Should use default values (0.4 for similarity, 0.08 for smoothness)
      const similaritySlider = screen.getByLabelText('색상 범위')
      expect(similaritySlider).toHaveValue('0.4')

      const smoothnessSlider = screen.getByLabelText('경계 부드러움')
      expect(smoothnessSlider).toHaveValue('0.08')
    })

    it('should update similarity when slider is changed', async () => {
      const projectWithChromaKey = {
        ...mockBasicModeProject,
        chromaKeyColor: '#00FF00',
        chromaKeySimilarity: 0.4,
        chromaKeySmoothness: 0.08,
      }

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(projectWithChromaKey),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        const chromaKeyCheckbox = screen.getByLabelText('크로마키 적용')
        expect(chromaKeyCheckbox).toBeChecked()
      })

      const similaritySlider = screen.getByLabelText('색상 범위')
      fireEvent.change(similaritySlider, { target: { value: '0.6' } })

      expect(similaritySlider).toHaveValue('0.6')
    })

    it('should reset to default values when reset button is clicked', async () => {
      const projectWithChromaKey = {
        ...mockBasicModeProject,
        chromaKeyColor: '#00FF00',
        chromaKeySimilarity: 0.6,
        chromaKeySmoothness: 0.2,
      }

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/projects/test-project-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(projectWithChromaKey),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(<EditProjectPage />)

      await waitFor(() => {
        const chromaKeyCheckbox = screen.getByLabelText('크로마키 적용')
        expect(chromaKeyCheckbox).toBeChecked()
      })

      // Find and click reset button
      const resetButton = screen.getByText('기본값으로 복원')
      fireEvent.click(resetButton)

      // Should reset to default values
      const similaritySlider = screen.getByLabelText('색상 범위')
      expect(similaritySlider).toHaveValue('0.4')

      const smoothnessSlider = screen.getByLabelText('경계 부드러움')
      expect(smoothnessSlider).toHaveValue('0.08')
    })
  })
})
