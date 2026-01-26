import { render, screen, fireEvent } from '@testing-library/react'
import ModeSelector from './ModeSelector'

describe('ModeSelector', () => {
  it('renders both mode options', () => {
    render(<ModeSelector mode="ar" onModeChange={() => {}} />)

    expect(screen.getByText('AR 모드')).toBeInTheDocument()
    expect(screen.getByText('기본 모드')).toBeInTheDocument()
  })

  it('shows AR mode as selected when mode is "ar"', () => {
    render(<ModeSelector mode="ar" onModeChange={() => {}} />)

    const arButton = screen.getByRole('button', { name: /AR 모드 선택/i })
    expect(arButton).toHaveAttribute('aria-pressed', 'true')

    const basicButton = screen.getByRole('button', { name: /기본 모드 선택/i })
    expect(basicButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows Basic mode as selected when mode is "basic"', () => {
    render(<ModeSelector mode="basic" onModeChange={() => {}} />)

    const arButton = screen.getByRole('button', { name: /AR 모드 선택/i })
    expect(arButton).toHaveAttribute('aria-pressed', 'false')

    const basicButton = screen.getByRole('button', { name: /기본 모드 선택/i })
    expect(basicButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onModeChange with "basic" when clicking basic mode', () => {
    const handleModeChange = jest.fn()
    render(<ModeSelector mode="ar" onModeChange={handleModeChange} />)

    const basicButton = screen.getByRole('button', { name: /기본 모드 선택/i })
    fireEvent.click(basicButton)

    expect(handleModeChange).toHaveBeenCalledWith('basic')
  })

  it('calls onModeChange with "ar" when clicking ar mode', () => {
    const handleModeChange = jest.fn()
    render(<ModeSelector mode="basic" onModeChange={handleModeChange} />)

    const arButton = screen.getByRole('button', { name: /AR 모드 선택/i })
    fireEvent.click(arButton)

    expect(handleModeChange).toHaveBeenCalledWith('ar')
  })

  it('disables buttons when disabled prop is true', () => {
    render(<ModeSelector mode="ar" onModeChange={() => {}} disabled />)

    const arButton = screen.getByRole('button', { name: /AR 모드 선택/i })
    const basicButton = screen.getByRole('button', { name: /기본 모드 선택/i })

    expect(arButton).toBeDisabled()
    expect(basicButton).toBeDisabled()
  })

  it('does not call onModeChange when disabled', () => {
    const handleModeChange = jest.fn()
    render(<ModeSelector mode="ar" onModeChange={handleModeChange} disabled />)

    const basicButton = screen.getByRole('button', { name: /기본 모드 선택/i })
    fireEvent.click(basicButton)

    expect(handleModeChange).not.toHaveBeenCalled()
  })
})
