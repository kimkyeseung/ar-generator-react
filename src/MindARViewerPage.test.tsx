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
      const loadingContainer = container.querySelector('div')
      expect(loadingContainer?.className).toContain('h-[100dvh]')

      // Should NOT use min-h-[100dvh]
      expect(loadingContainer?.className).not.toContain('min-h-[100dvh]')
    })
  })

  describe('AR mode rendering', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: {
          fileIds: {
            mindFileId: 'mind-123',
            videoFileId: 'video-123',
            targetImageFileId: 'target-123',
            mode: 'ar',
            cameraResolution: 'fhd',
          },
          assets: {
            mindUrl: 'blob:mind-url',
            videoUrl: 'blob:video-url',
            targetImageUrl: 'blob:target-url',
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
      mockUseQuery.mockReturnValue({
        data: {
          fileIds: {
            videoFileId: 'video-123',
            mode: 'basic',
            videoPosition: { x: 0.5, y: 0.5 },
            videoScale: 1,
            cameraResolution: 'fhd',
          },
          assets: {
            videoUrl: 'blob:video-url',
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
})
