// Mock react-router-dom before imports
const mockNavigate = jest.fn()
jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
)

// Mock verifyPassword
const mockVerifyPassword = jest.fn()
jest.mock('../utils/auth', () => ({
  verifyPassword: () => mockVerifyPassword(),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProjectListPage from './ProjectListPage'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock Image to avoid canvas issues
class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  constructor() {
    setTimeout(() => this.onload?.(), 0)
  }
}
global.Image = MockImage as unknown as typeof Image

// Suppress image/canvas loading errors in jsdom
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      args[0]?.includes?.('Error loading image') ||
      args[0]?.includes?.('canvas') ||
      args[0]?.includes?.('img') ||
      args[0]?.includes?.('Cannot read properties of undefined')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

describe('ProjectListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockVerifyPassword.mockReset()
  })

  describe('Initial Rendering', () => {
    it('should render the page title', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      render(<ProjectListPage />)

      expect(await screen.findByText('내 프로젝트')).toBeInTheDocument()
    })

    it('should render create project button', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      render(<ProjectListPage />)

      expect(
        await screen.findByText('+ 새 프로젝트 만들기')
      ).toBeInTheDocument()
    })

    it('should show loading state while fetching', () => {
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
  })

  describe('Empty State', () => {
    it('should show empty state message when no projects', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      render(<ProjectListPage />)

      expect(
        await screen.findByText('아직 프로젝트가 없습니다')
      ).toBeInTheDocument()
    })

    it('should show create button in empty state', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      render(<ProjectListPage />)

      await screen.findByText('아직 프로젝트가 없습니다')
      expect(screen.getByText('프로젝트 만들기')).toBeInTheDocument()
    })
  })

  describe('Project List', () => {
    const mockProjects = [
      {
        id: '1',
        folderId: 'folder-1',
        title: '첫 번째 프로젝트',
        createdAt: '2024-01-15T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z',

        targetFileId: 'target-1',
        targetImageFileId: null, // null to avoid canvas image loading issues in jsdom
        chromaKeyColor: '#00FF00',
        flatView: true,
      },
      {
        id: '2',
        folderId: 'folder-2',
        title: '두 번째 프로젝트',
        createdAt: '2024-01-16T00:00:00.000Z',
        updatedAt: '2024-01-16T00:00:00.000Z',

        targetFileId: 'target-2',
        targetImageFileId: null,
        chromaKeyColor: null,
        flatView: false,
      },
    ]

    it('should display project titles', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      })

      render(<ProjectListPage />)

      expect(await screen.findByText('첫 번째 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('두 번째 프로젝트')).toBeInTheDocument()
    })

    it('should display chromakey badge for projects with chromakey', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      })

      render(<ProjectListPage />)

      await screen.findByText('첫 번째 프로젝트')
      expect(screen.getByText('크로마키')).toBeInTheDocument()
    })

    it('should have action buttons for each project', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockProjects[0]]),
      })

      render(<ProjectListPage />)

      await screen.findByText('첫 번째 프로젝트')
      expect(screen.getByText('편집')).toBeInTheDocument()
      expect(screen.getByText('QR')).toBeInTheDocument()
      expect(screen.getByText('AR')).toBeInTheDocument()
      expect(screen.getByText('삭제')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate to create page when clicking create button', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      render(<ProjectListPage />)

      const createButton = await screen.findByText('+ 새 프로젝트 만들기')
      fireEvent.click(createButton)

      expect(mockNavigate).toHaveBeenCalledWith('/create')
    })

    it('should navigate to edit page when clicking edit button', async () => {
      const mockProject = {
        id: 'project-123',
        folderId: 'folder-123',
        title: '테스트',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',

        targetFileId: 'target-1',
        targetImageFileId: null,
        chromaKeyColor: null,
        flatView: false,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockProject]),
      })

      render(<ProjectListPage />)

      const editButton = await screen.findByText('편집')
      fireEvent.click(editButton)

      expect(mockNavigate).toHaveBeenCalledWith('/edit/project-123')
    })

    it('should navigate to QR page when clicking QR button', async () => {
      const mockProject = {
        id: 'project-123',
        folderId: 'folder-123',
        title: '테스트',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',

        targetFileId: 'target-1',
        targetImageFileId: null,
        chromaKeyColor: null,
        flatView: false,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockProject]),
      })

      render(<ProjectListPage />)

      const qrButton = await screen.findByText('QR')
      fireEvent.click(qrButton)

      expect(mockNavigate).toHaveBeenCalledWith('/result/qr/folder-123')
    })

    it('should navigate to AR page when clicking AR button', async () => {
      const mockProject = {
        id: 'project-123',
        folderId: 'folder-123',
        title: '테스트',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',

        targetFileId: 'target-1',
        targetImageFileId: null,
        chromaKeyColor: null,
        flatView: false,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockProject]),
      })

      render(<ProjectListPage />)

      const arButton = await screen.findByText('AR')
      fireEvent.click(arButton)

      expect(mockNavigate).toHaveBeenCalledWith('/result/folder-123')
    })
  })

  describe('Error Handling', () => {
    it('should show error message when API fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      render(<ProjectListPage />)

      expect(
        await screen.findByText('프로젝트 목록을 불러오는데 실패했습니다.')
      ).toBeInTheDocument()
    })

    it('should show retry button on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      render(<ProjectListPage />)

      expect(await screen.findByText('다시 시도')).toBeInTheDocument()
    })

    it('should retry fetching when clicking retry button', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

      render(<ProjectListPage />)

      const retryButton = await screen.findByText('다시 시도')
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Delete Functionality', () => {
    it('should show password modal when clicking delete', async () => {
      const mockProject = {
        id: 'project-123',
        folderId: 'folder-123',
        title: '테스트',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',

        targetFileId: 'target-1',
        targetImageFileId: null,
        chromaKeyColor: null,
        flatView: false,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockProject]),
      })

      render(<ProjectListPage />)

      const deleteButton = await screen.findByText('삭제')
      fireEvent.click(deleteButton)

      // Password modal should appear
      expect(await screen.findByText('비밀번호 입력')).toBeInTheDocument()
    })

    it('should remove project from list after successful delete', async () => {
      mockVerifyPassword.mockResolvedValue(true)

      const mockProject = {
        id: 'project-123',
        folderId: 'folder-123',
        title: '삭제될 프로젝트',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',

        targetFileId: 'target-1',
        targetImageFileId: null,
        chromaKeyColor: null,
        flatView: false,
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockProject]),
        })
        .mockResolvedValueOnce({
          ok: true,
        })

      render(<ProjectListPage />)

      await screen.findByText('삭제될 프로젝트')

      // Click delete button to open password modal
      const deleteButton = screen.getByText('삭제')
      fireEvent.click(deleteButton)

      // Wait for password modal and enter password
      const passwordInput = await screen.findByPlaceholderText('비밀번호를 입력하세요')
      fireEvent.change(passwordInput, { target: { value: 'test-password' } })

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: '확인' })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.queryByText('삭제될 프로젝트')).not.toBeInTheDocument()
      })
    })
  })
})
