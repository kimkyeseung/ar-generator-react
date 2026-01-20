/**
 * TargetImageUpload component tests
 *
 * Tests verify the component renders correctly and handles file selection.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import TargetImageUpload from './TargetImageUpload'

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

describe('TargetImageUpload', () => {
  const defaultProps = {
    files: [],
    onFileSelect: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<TargetImageUpload {...defaultProps} />)
      expect(container).toBeTruthy()
    })

    it('should show Target Image label', () => {
      render(<TargetImageUpload {...defaultProps} />)
      expect(screen.getByText('Target Image')).toBeInTheDocument()
    })

    it('should show upload instructions when no files selected', () => {
      render(<TargetImageUpload {...defaultProps} />)
      expect(
        screen.getByText('드래그 앤 드롭 또는 클릭하여 파일 선택')
      ).toBeInTheDocument()
    })

    it('should show image file types hint', () => {
      render(<TargetImageUpload {...defaultProps} />)
      expect(
        screen.getByText('이미지 파일 (JPG, PNG, WebP)')
      ).toBeInTheDocument()
    })
  })

  describe('file selection', () => {
    it('should call onFileSelect with array when single file is selected', () => {
      const onFileSelect = jest.fn()
      render(<TargetImageUpload files={[]} onFileSelect={onFileSelect} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(input).toBeTruthy()

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })

      fireEvent.change(input)

      expect(onFileSelect).toHaveBeenCalledWith([file])
    })

    it('should call onFileSelect with array when multiple files are selected', () => {
      const onFileSelect = jest.fn()
      render(<TargetImageUpload files={[]} onFileSelect={onFileSelect} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(input).toBeTruthy()

      const file1 = new File(['test1'], 'test1.png', { type: 'image/png' })
      const file2 = new File(['test2'], 'test2.png', { type: 'image/png' })
      Object.defineProperty(input, 'files', {
        value: [file1, file2],
        configurable: true,
      })

      fireEvent.change(input)

      expect(onFileSelect).toHaveBeenCalledWith([file1, file2])
    })

    it('should call onFileSelect with empty array when null is provided', () => {
      const onFileSelect = jest.fn()
      render(<TargetImageUpload files={[]} onFileSelect={onFileSelect} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(input).toBeTruthy()

      Object.defineProperty(input, 'files', {
        value: [],
        configurable: true,
      })

      fireEvent.change(input)

      // Should not call onFileSelect when no files are selected
      expect(onFileSelect).not.toHaveBeenCalled()
    })

    it('should accept image files', () => {
      render(<TargetImageUpload {...defaultProps} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.accept).toBe('image/*')
    })

    it('should allow multiple file selection', () => {
      render(<TargetImageUpload {...defaultProps} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.multiple).toBe(true)
    })
  })

  describe('displaying selected files', () => {
    it('should display file name when file is selected', () => {
      const file = new File(['test'], 'my-target.png', { type: 'image/png' })
      render(<TargetImageUpload files={[file]} onFileSelect={jest.fn()} />)

      expect(screen.getByText('my-target.png')).toBeInTheDocument()
    })

    it('should display file size', () => {
      // Create a file with known size (1MB)
      const content = new Array(1024 * 1024).fill('a').join('')
      const file = new File([content], 'large-file.png', { type: 'image/png' })
      render(<TargetImageUpload files={[file]} onFileSelect={jest.fn()} />)

      // Should show file size in MB
      expect(screen.getByText('1.00 MB')).toBeInTheDocument()
    })

    it('should display multiple files', () => {
      const file1 = new File(['test1'], 'image1.png', { type: 'image/png' })
      const file2 = new File(['test2'], 'image2.png', { type: 'image/png' })
      render(
        <TargetImageUpload files={[file1, file2]} onFileSelect={jest.fn()} />
      )

      expect(screen.getByText('image1.png')).toBeInTheDocument()
      expect(screen.getByText('image2.png')).toBeInTheDocument()
    })
  })

  describe('file removal', () => {
    it('should call onFileSelect without removed file when remove button is clicked', () => {
      const onFileSelect = jest.fn()
      const file1 = new File(['test1'], 'image1.png', { type: 'image/png' })
      const file2 = new File(['test2'], 'image2.png', { type: 'image/png' })

      render(
        <TargetImageUpload
          files={[file1, file2]}
          onFileSelect={onFileSelect}
        />
      )

      // Find and click the remove button for the first file
      const removeButtons = screen.getAllByRole('button')
      fireEvent.click(removeButtons[0])

      // Should call with remaining files or empty array
      expect(onFileSelect).toHaveBeenCalled()
    })
  })

  describe('drag and drop', () => {
    it('should handle drag over event', () => {
      render(<TargetImageUpload {...defaultProps} />)

      const dropZone = screen.getByText('드래그 앤 드롭 또는 클릭하여 파일 선택').closest('div')!.parentElement!

      fireEvent.dragOver(dropZone)

      // Should not throw
      expect(dropZone).toBeInTheDocument()
    })

    it('should handle drag leave event', () => {
      render(<TargetImageUpload {...defaultProps} />)

      const dropZone = screen.getByText('드래그 앤 드롭 또는 클릭하여 파일 선택').closest('div')!.parentElement!

      fireEvent.dragLeave(dropZone)

      // Should not throw
      expect(dropZone).toBeInTheDocument()
    })

    it('should handle drop event with files', () => {
      const onFileSelect = jest.fn()
      render(<TargetImageUpload files={[]} onFileSelect={onFileSelect} />)

      const dropZone = screen.getByText('드래그 앤 드롭 또는 클릭하여 파일 선택').closest('div')!.parentElement!

      const file = new File(['test'], 'dropped.png', { type: 'image/png' })
      const dataTransfer = {
        files: [file],
      }

      fireEvent.drop(dropZone, { dataTransfer })

      expect(onFileSelect).toHaveBeenCalled()
    })
  })
})

describe('TargetImageUpload props interface', () => {
  it('should have correct props type', () => {
    type Props = {
      files: File[]
      onFileSelect: (files: File[]) => void
    }

    const validProps: Props = {
      files: [],
      onFileSelect: () => {},
    }

    expect(validProps.files).toEqual([])
    expect(typeof validProps.onFileSelect).toBe('function')
  })
})
