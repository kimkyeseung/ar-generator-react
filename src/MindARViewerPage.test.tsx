/**
 * MindARViewerPage unit tests
 *
 * These tests verify:
 * - Container styling uses h-[100dvh] (not min-h) for proper landscape support
 * - overflow-hidden is applied to prevent content overflow during orientation change
 * - Both AR mode and Basic mode render correctly
 */

// Mock react-router-dom hooks before any imports
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
}), { virtual: true })

// Mock react-query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}), { virtual: true })

// Mock the viewer components
jest.mock('./components/MindarViewer', () => ({
  __esModule: true,
  default: () => {
    const React = require('react')
    return React.createElement('div', { 'data-testid': 'mindar-viewer' }, 'MindAR Viewer')
  },
}))

jest.mock('./components/BasicModeViewer', () => ({
  __esModule: true,
  default: () => {
    const React = require('react')
    return React.createElement('div', { 'data-testid': 'basic-mode-viewer' }, 'Basic Mode Viewer')
  },
}))

jest.mock('./components/ConsoleLogOverlay', () => ({
  __esModule: true,
  default: () => {
    const React = require('react')
    return React.createElement('div', { 'data-testid': 'console-log-overlay' }, 'Console Log Overlay')
  },
}))

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn()
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
  configurable: true,
})

import MindARViewerPage from './MindARViewerPage'

describe('MindARViewerPage', () => {
  const mockUseParams = useParams as jest.MockedFunction<typeof useParams>
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>
  const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

  beforeEach(() => {
    jest.clearAllMocks()
    // Setup camera mock to resolve immediately
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    })
    // Setup default router mocks
    mockUseParams.mockReturnValue({ folderId: 'test-folder-id' })
    mockUseSearchParams.mockReturnValue([new URLSearchParams(''), jest.fn()] as any)
  })

  describe('loading state', () => {
    it('should show loading screen when data is loading', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      render(<MindARViewerPage />)

      expect(screen.getByText('AR 준비 중...')).toBeInTheDocument()
    })

    it('should have correct viewport height class on loading container', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      const { container } = render(<MindARViewerPage />)

      // Check that loading container uses h-[100dvh] class
      // The loading container with h-[100dvh] is the second div (after LandscapeWarningOverlay)
      const loadingContainer = container.querySelector('div.h-\\[100dvh\\]')
      expect(loadingContainer).toBeInTheDocument()
      expect(loadingContainer?.className).toContain('h-[100dvh]')

      // Should NOT use min-h-[100dvh]
      expect(loadingContainer?.className).not.toContain('min-h-[100dvh]')
    })
  })

  describe('AR mode rendering', () => {
    beforeEach(() => {
      // 트래킹 아이템이 있으면 AR 모드로 렌더링
      mockUseQuery.mockReturnValue({
        data: {
          fileIds: {
            mindFileId: 'mind-123',
            videoFileId: 'video-123',
            targetImageFileId: 'target-123',
            mode: 'ar',
            cameraResolution: 'fhd',
            mediaItems: [
              {
                id: 'video-1',
                type: 'video',
                mode: 'tracking', // 트래킹 아이템이 있어야 AR 모드
                fileId: 'file-1',
                order: 0,
              },
            ],
          },
          assets: {
            mindUrl: 'blob:mind-url',
            targetImageUrl: 'blob:target-url',
            mainVideo: {
              id: 'video-1',
              type: 'video',
              mode: 'tracking',
              fileUrl: 'blob:video-url',
              position: { x: 0.5, y: 0.5 },
              scale: 1,
              aspectRatio: 16 / 9,
              chromaKeyEnabled: false,
              chromaKeySettings: { similarity: 0.4, smoothness: 0.08 },
              flatView: false,
              linkEnabled: false,
              order: 0,
            },
            mediaItems: [],
          },
        },
        isLoading: false,
      } as any)
    })

    it('should render MindARViewer in AR mode after camera is ready', async () => {
      render(<MindARViewerPage />)

      // Wait for camera permission to be granted and component to re-render
      await waitFor(() => {
        expect(screen.getByTestId('mindar-viewer')).toBeInTheDocument()
      })
    })

    it('should have correct container styling for landscape support', async () => {
      const { container } = render(<MindARViewerPage />)

      // Wait for the viewer to render
      await waitFor(() => {
        expect(screen.getByTestId('mindar-viewer')).toBeInTheDocument()
      })

      const section = container.querySelector('section')
      expect(section).toBeInTheDocument()

      // Check that section uses h-[100dvh] (not min-h-[100dvh]) for landscape support
      expect(section?.className).toContain('h-[100dvh]')
      expect(section?.className).not.toContain('min-h-[100dvh]')

      // Check overflow-hidden to prevent content overflow during orientation change
      expect(section?.className).toContain('overflow-hidden')
    })
  })

  describe('Basic mode rendering', () => {
    beforeEach(() => {
      // 트래킹 아이템이 없으면 기본 모드로 렌더링
      mockUseQuery.mockReturnValue({
        data: {
          fileIds: {
            videoFileId: 'video-123',
            mode: 'basic', // 백엔드 호환성을 위해 유지되지만 실제 결정은 mediaItems로
            videoPosition: { x: 0.5, y: 0.5 },
            videoScale: 1,
            cameraResolution: 'fhd',
            mediaItems: [
              {
                id: 'video-1',
                type: 'video',
                mode: 'basic', // 트래킹 아이템 없음
                fileId: 'file-1',
                order: 0,
              },
            ],
          },
          assets: {
            mainVideo: {
              id: 'video-1',
              type: 'video',
              mode: 'basic',
              fileUrl: 'blob:video-url',
              position: { x: 0.5, y: 0.5 },
              scale: 1,
              aspectRatio: 16 / 9,
              chromaKeyEnabled: false,
              chromaKeySettings: { similarity: 0.4, smoothness: 0.08 },
              flatView: false,
              linkEnabled: false,
              order: 0,
            },
            mediaItems: [],
          },
        },
        isLoading: false,
      } as any)
    })

    it('should render BasicModeViewer in basic mode after camera is ready', async () => {
      render(<MindARViewerPage />)

      // Wait for camera permission to be granted and component to re-render
      await waitFor(() => {
        expect(screen.getByTestId('basic-mode-viewer')).toBeInTheDocument()
      })
    })

    it('should have correct container styling for landscape support', async () => {
      const { container } = render(<MindARViewerPage />)

      // Wait for the viewer to render
      await waitFor(() => {
        expect(screen.getByTestId('basic-mode-viewer')).toBeInTheDocument()
      })

      const section = container.querySelector('section')
      expect(section).toBeInTheDocument()

      // Check that section uses h-[100dvh] (not min-h-[100dvh]) for landscape support
      expect(section?.className).toContain('h-[100dvh]')
      expect(section?.className).not.toContain('min-h-[100dvh]')

      // Check overflow-hidden to prevent content overflow during orientation change
      expect(section?.className).toContain('overflow-hidden')
    })
  })

  describe('Media item mode selection in AR mode', () => {
    it('should select tracking mode video as mainVideo in AR mode', async () => {
      // AR 모드에서 tracking 모드 비디오만 메인 비디오로 선택되어야 함
      mockUseQuery.mockReturnValue({
        data: {
          fileIds: {
            mindFileId: 'mind-123',
            targetImageFileId: 'target-123',
            mode: 'ar',
            cameraResolution: 'fhd',
            mediaItems: [
              {
                id: 'video-1',
                type: 'video',
                mode: 'tracking',
                fileId: 'file-1',
                order: 0,
              },
            ],
          },
          assets: {
            mindUrl: 'blob:mind-url',
            targetImageUrl: 'blob:target-url',
            mainVideo: {
              id: 'video-1',
              type: 'video',
              mode: 'tracking',
              fileUrl: 'blob:video-url',
              position: { x: 0.5, y: 0.5 },
              scale: 1,
              aspectRatio: 16 / 9,
              chromaKeyEnabled: false,
              chromaKeySettings: { similarity: 0.4, smoothness: 0.08 },
              flatView: false,
              linkEnabled: false,
              order: 0,
            },
            mediaItems: [],
          },
        },
        isLoading: false,
      } as any)

      render(<MindARViewerPage />)

      await waitFor(() => {
        expect(screen.getByTestId('mindar-viewer')).toBeInTheDocument()
      })
    })

    it('should render BasicModeViewer when only basic mode videos exist', async () => {
      // basic 모드 비디오만 있으면 BasicModeViewer로 렌더링 (트래킹 아이템이 없으므로)
      mockUseQuery.mockReturnValue({
        data: {
          fileIds: {
            mode: 'ar', // 프로젝트 모드가 ar이어도
            cameraResolution: 'fhd',
            mediaItems: [
              {
                id: 'video-1',
                type: 'video',
                mode: 'basic', // 트래킹 아이템이 없으면
                fileId: 'file-1',
                order: 0,
              },
            ],
          },
          assets: {
            mainVideo: {
              id: 'video-1',
              type: 'video',
              mode: 'basic',
              fileUrl: 'blob:video-url',
              position: { x: 0.5, y: 0.5 },
              scale: 1,
              aspectRatio: 16 / 9,
              chromaKeyEnabled: false,
              chromaKeySettings: { similarity: 0.4, smoothness: 0.08 },
              flatView: false,
              linkEnabled: false,
              order: 0,
            },
            mediaItems: [],
          },
        },
        isLoading: false,
      } as any)

      render(<MindARViewerPage />)

      await waitFor(() => {
        // 트래킹 아이템이 없으므로 BasicModeViewer로 렌더링
        expect(screen.getByTestId('basic-mode-viewer')).toBeInTheDocument()
      })
    })

    it('should select first tracking video when multiple videos exist with different modes', async () => {
      // 여러 비디오 중 첫 번째 tracking 모드 비디오가 메인 비디오로 선택되어야 함
      // basic 모드 비디오는 mediaItems에 포함되어 오버레이로 렌더링됨
      mockUseQuery.mockReturnValue({
        data: {
          fileIds: {
            mindFileId: 'mind-123',
            targetImageFileId: 'target-123',
            mode: 'ar',
            cameraResolution: 'fhd',
            mediaItems: [
              {
                id: 'video-1',
                type: 'video',
                mode: 'basic', // 첫 번째 비디오는 basic
                fileId: 'file-1',
                order: 0,
              },
              {
                id: 'video-2',
                type: 'video',
                mode: 'tracking', // 두 번째 비디오는 tracking
                fileId: 'file-2',
                order: 1,
              },
            ],
          },
          assets: {
            mindUrl: 'blob:mind-url',
            targetImageUrl: 'blob:target-url',
            mainVideo: {
              id: 'video-2', // tracking 모드인 video-2가 메인 비디오
              type: 'video',
              mode: 'tracking',
              fileUrl: 'blob:video-url-2',
              position: { x: 0.5, y: 0.5 },
              scale: 1,
              aspectRatio: 16 / 9,
              chromaKeyEnabled: false,
              chromaKeySettings: { similarity: 0.4, smoothness: 0.08 },
              flatView: false,
              linkEnabled: false,
              order: 1,
            },
            mediaItems: [
              {
                id: 'video-1', // basic 모드 비디오는 mediaItems에 포함
                type: 'video',
                mode: 'basic',
                fileUrl: 'blob:video-url-1',
                position: { x: 0.3, y: 0.3 },
                scale: 0.5,
                aspectRatio: 16 / 9,
                chromaKeyEnabled: false,
                chromaKeySettings: { similarity: 0.4, smoothness: 0.08 },
                flatView: false,
                linkEnabled: false,
                order: 0,
              },
            ],
          },
        },
        isLoading: false,
      } as any)

      render(<MindARViewerPage />)

      await waitFor(() => {
        // MindARViewer가 렌더링되어야 함 (tracking 모드 비디오가 있으므로)
        expect(screen.getByTestId('mindar-viewer')).toBeInTheDocument()
      })
    })

    it('should render BasicModeViewer when all items are basic mode', async () => {
      // 모든 미디어 아이템이 basic 모드이면 BasicModeViewer 렌더링
      mockUseQuery.mockReturnValue({
        data: {
          fileIds: {
            mode: 'basic', // 백엔드 호환성
            cameraResolution: 'fhd',
            mediaItems: [
              {
                id: 'video-1',
                type: 'video',
                mode: 'basic', // basic 모드만 있음
                fileId: 'file-1',
                order: 0,
              },
            ],
          },
          assets: {
            mainVideo: {
              id: 'video-1',
              type: 'video',
              mode: 'basic',
              fileUrl: 'blob:video-url',
              position: { x: 0.5, y: 0.5 },
              scale: 1,
              aspectRatio: 16 / 9,
              chromaKeyEnabled: false,
              chromaKeySettings: { similarity: 0.4, smoothness: 0.08 },
              flatView: false,
              linkEnabled: false,
              order: 0,
            },
            mediaItems: [],
          },
        },
        isLoading: false,
      } as any)

      render(<MindARViewerPage />)

      await waitFor(() => {
        // 트래킹 아이템이 없으므로 BasicModeViewer가 렌더링됨
        expect(screen.getByTestId('basic-mode-viewer')).toBeInTheDocument()
      })
    })

    it('should render MindARViewer when tracking items exist regardless of project mode', async () => {
      // 트래킹 아이템이 있으면 프로젝트 모드와 관계없이 AR 모드로 렌더링
      mockUseQuery.mockReturnValue({
        data: {
          fileIds: {
            mindFileId: 'mind-123',
            targetImageFileId: 'target-123',
            mode: 'basic', // 프로젝트 모드가 basic이더라도
            cameraResolution: 'fhd',
            mediaItems: [
              {
                id: 'video-1',
                type: 'video',
                mode: 'tracking', // tracking 아이템이 있으면
                fileId: 'file-1',
                order: 0,
              },
            ],
          },
          assets: {
            mindUrl: 'blob:mind-url',
            targetImageUrl: 'blob:target-url',
            mainVideo: {
              id: 'video-1',
              type: 'video',
              mode: 'tracking',
              fileUrl: 'blob:video-url',
              position: { x: 0.5, y: 0.5 },
              scale: 1,
              aspectRatio: 16 / 9,
              chromaKeyEnabled: false,
              chromaKeySettings: { similarity: 0.4, smoothness: 0.08 },
              flatView: false,
              linkEnabled: false,
              order: 0,
            },
            mediaItems: [],
          },
        },
        isLoading: false,
      } as any)

      render(<MindARViewerPage />)

      await waitFor(() => {
        // 트래킹 아이템이 있으므로 MindARViewer가 렌더링됨
        expect(screen.getByTestId('mindar-viewer')).toBeInTheDocument()
      })
    })
  })
})
