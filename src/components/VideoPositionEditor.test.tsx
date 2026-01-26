import { render, screen, fireEvent } from '@testing-library/react'
import VideoPositionEditor from './VideoPositionEditor'

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn()
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
})

// Mock URL.createObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = jest.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

describe('VideoPositionEditor', () => {
  const mockVideoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
  const defaultProps = {
    videoFile: mockVideoFile,
    position: { x: 0.5, y: 0.5 },
    scale: 1,
    onPositionChange: jest.fn(),
    onScaleChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    })
  })

  it('renders the component with title', () => {
    render(<VideoPositionEditor {...defaultProps} />)

    expect(screen.getByText('영상 위치 조정')).toBeInTheDocument()
  })

  it('displays initial position values', () => {
    render(<VideoPositionEditor {...defaultProps} position={{ x: 0.3, y: 0.7 }} />)

    expect(screen.getByText('X: 30%')).toBeInTheDocument()
    expect(screen.getByText('Y: 70%')).toBeInTheDocument()
  })

  it('displays scale percentage', () => {
    render(<VideoPositionEditor {...defaultProps} scale={1.5} />)

    expect(screen.getByText('150%')).toBeInTheDocument()
  })

  it('calls onScaleChange when + button is clicked', () => {
    const onScaleChange = jest.fn()
    render(<VideoPositionEditor {...defaultProps} scale={1} onScaleChange={onScaleChange} />)

    const plusButton = screen.getByRole('button', { name: '+' })
    fireEvent.click(plusButton)

    expect(onScaleChange).toHaveBeenCalledWith(1.1)
  })

  it('calls onScaleChange when - button is clicked', () => {
    const onScaleChange = jest.fn()
    render(<VideoPositionEditor {...defaultProps} scale={1} onScaleChange={onScaleChange} />)

    const minusButton = screen.getByRole('button', { name: '-' })
    fireEvent.click(minusButton)

    expect(onScaleChange).toHaveBeenCalledWith(0.9)
  })

  it('disables - button at minimum scale', () => {
    render(<VideoPositionEditor {...defaultProps} scale={0.2} />)

    const minusButton = screen.getByRole('button', { name: '-' })
    expect(minusButton).toBeDisabled()
  })

  it('disables + button at maximum scale', () => {
    render(<VideoPositionEditor {...defaultProps} scale={2} />)

    const plusButton = screen.getByRole('button', { name: '+' })
    expect(plusButton).toBeDisabled()
  })

  it('resets position and scale when reset button is clicked', () => {
    const onPositionChange = jest.fn()
    const onScaleChange = jest.fn()
    render(
      <VideoPositionEditor
        {...defaultProps}
        position={{ x: 0.3, y: 0.7 }}
        scale={1.5}
        onPositionChange={onPositionChange}
        onScaleChange={onScaleChange}
      />
    )

    const resetButton = screen.getByRole('button', { name: '초기화' })
    fireEvent.click(resetButton)

    expect(onPositionChange).toHaveBeenCalledWith({ x: 0.5, y: 0.5 })
    expect(onScaleChange).toHaveBeenCalledWith(1)
  })

  it('calls onScaleChange when slider is changed', () => {
    const onScaleChange = jest.fn()
    render(<VideoPositionEditor {...defaultProps} onScaleChange={onScaleChange} />)

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '1.5' } })

    expect(onScaleChange).toHaveBeenCalledWith(1.5)
  })

  it('displays drag instruction text', () => {
    render(<VideoPositionEditor {...defaultProps} />)

    expect(screen.getByText('드래그하여 위치 조정')).toBeInTheDocument()
  })

  it('shows camera error message when camera access fails', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Camera access denied'))

    render(<VideoPositionEditor {...defaultProps} />)

    // Wait for the camera error to be displayed
    const errorMessage = await screen.findByText('카메라 접근 권한이 필요합니다.')
    expect(errorMessage).toBeInTheDocument()
  })
})
