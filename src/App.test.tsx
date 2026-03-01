// Mock modules before any imports
jest.mock('mind-ar/dist/mindar-image.prod.js', () => ({}), { virtual: true })
jest.mock('mind-ar/dist/mindar-image-aframe.prod.js', () => ({}), { virtual: true })
jest.mock('aframe', () => ({}), { virtual: true })

// Mock react-router-dom
const mockNavigate = jest.fn()
const mockUseParams = jest.fn()
jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
    MemoryRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Route: ({ element }: { element: React.ReactNode }) => <>{element}</>,
  }),
  { virtual: true }
)

// Mock qrcode to avoid TextEncoder issue in Jest
jest.mock('qrcode', () => ({
  toCanvas: jest.fn(),
}))

import React from 'react'
import { render, screen } from '@testing-library/react'
import ProjectListPage from './pages/ProjectListPage'
import { QRCodePage } from './QRCodePage'

// Mock fetch for API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Set up environment before tests
process.env.REACT_APP_API_URL = 'http://localhost:4000'

// Mock AFRAME
beforeAll(() => {
  ;(global as any).AFRAME = {
    registerComponent: jest.fn(),
    components: {},
    THREE: {
      Quaternion: jest.fn(),
      VideoTexture: jest.fn(),
      LinearFilter: 1,
      RGBAFormat: 1,
      Color: jest.fn(),
      ShaderMaterial: jest.fn(),
      Vector3: jest.fn(),
      DoubleSide: 2,
    },
  }
})

describe('App Core Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('ProjectListPage Rendering', () => {
    it('should render without crashing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      const { container } = render(<ProjectListPage />)

      expect(container).toBeTruthy()
    })

    it('should render the create button', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      render(<ProjectListPage />)

      expect(
        await screen.findByText('+ 새 프로젝트 만들기')
      ).toBeInTheDocument()
    })

    it('should show loading state initially', () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve([]),
                }),
              1000
            )
          )
      )

      render(<ProjectListPage />)

      expect(screen.getByText('로딩 중...')).toBeInTheDocument()
    })

    it('should display empty state when no projects exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      render(<ProjectListPage />)

      expect(
        await screen.findByText('아직 프로젝트가 없습니다')
      ).toBeInTheDocument()
      expect(
        screen.getByText('첫 번째 AR 프로젝트를 만들어보세요!')
      ).toBeInTheDocument()
    })

    it('should display projects when they exist', async () => {
      const mockProjects = [
        {
          id: '1',
          folderId: 'folder-1',
          title: '테스트 프로젝트',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',

          targetFileId: 'target-1',
          targetImageFileId: null, // null to avoid canvas image loading issues in jsdom
          chromaKeyColor: null,
          flatView: false,
        },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      })

      render(<ProjectListPage />)

      expect(await screen.findByText('테스트 프로젝트')).toBeInTheDocument()
    })

    it('should show error state when API fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      render(<ProjectListPage />)

      expect(
        await screen.findByText('프로젝트 목록을 불러오는데 실패했습니다.')
      ).toBeInTheDocument()
      expect(screen.getByText('다시 시도')).toBeInTheDocument()
    })
  })

  describe('API Integration', () => {
    it('should call projects API on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      render(<ProjectListPage />)

      await screen.findByText('아직 프로젝트가 없습니다')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects'),
        expect.anything()
      )
    })
  })
})

describe('QRCodePage', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ folderId: 'test-folder-123' })
  })

  it('should display QR page elements', async () => {
    render(<QRCodePage />)

    expect(await screen.findByText('게시 완료!')).toBeInTheDocument()
    expect(
      screen.getByText('QR 코드를 스캔하여 AR 콘텐츠를 확인하세요')
    ).toBeInTheDocument()
  })

  it('should display correct URL with folderId', async () => {
    render(<QRCodePage />)

    await screen.findByText('게시 완료!')

    // Check URL contains the folderId
    expect(
      screen.getByText((content) => content.includes('/result/test-folder-123'))
    ).toBeInTheDocument()
  })

  it('should have download button', async () => {
    render(<QRCodePage />)

    await screen.findByText('게시 완료!')
    expect(screen.getByText('다운로드')).toBeInTheDocument()
  })

  it('should have navigation buttons', async () => {
    render(<QRCodePage />)

    await screen.findByText('게시 완료!')
    expect(screen.getByText('이동하기')).toBeInTheDocument()
    expect(screen.getByText('뒤로 가기')).toBeInTheDocument()
  })
})
