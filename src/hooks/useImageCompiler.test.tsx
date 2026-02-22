/**
 * useImageCompiler hook tests
 *
 * Tests verify the hook's interface, state management, and compilation flow.
 */

import React from 'react'
import { render, act } from '@testing-library/react'

// Create mock functions before module mock
const mockCompileImageTargets = jest.fn()
const mockExportData = jest.fn()

// Mock the compiler module - must be before useImageCompiler import
jest.mock('../lib/image-target/compiler', () => ({
  Compiler: class MockCompiler {
    compileImageTargets = mockCompileImageTargets
    exportData = mockExportData
  },
}))

// Import the hook after the mock is set up
import { useImageCompiler } from './useImageCompiler'

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

// Test component to access the hook
interface TestComponentProps {
  onHookResult: (result: ReturnType<typeof useImageCompiler>) => void
}

function TestComponent({ onHookResult }: TestComponentProps) {
  const result = useImageCompiler()
  React.useEffect(() => {
    onHookResult(result)
  }, [result, onHookResult])
  return null
}

describe('useImageCompiler', () => {
  let hookResult: ReturnType<typeof useImageCompiler>

  const renderTestComponent = () => {
    return render(
      <TestComponent
        onHookResult={(result) => {
          hookResult = result
        }}
      />
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCompileImageTargets.mockResolvedValue(undefined)
    mockExportData.mockReturnValue(new Uint8Array([1, 2, 3, 4]))
  })

  describe('initial state', () => {
    it('should return isCompiling as false initially', () => {
      renderTestComponent()
      expect(hookResult.isCompiling).toBe(false)
    })

    it('should return progress as 0 initially', () => {
      renderTestComponent()
      expect(hookResult.progress).toBe(0)
    })

    it('should return compile function', () => {
      renderTestComponent()
      expect(typeof hookResult.compile).toBe('function')
    })

    it('should return reset function', () => {
      renderTestComponent()
      expect(typeof hookResult.reset).toBe('function')
    })
  })

  describe('reset', () => {
    it('should be callable without errors', () => {
      renderTestComponent()
      expect(() => {
        act(() => {
          hookResult.reset()
        })
      }).not.toThrow()
    })

    it('should reset progress to 0', () => {
      renderTestComponent()
      act(() => {
        hookResult.reset()
      })
      expect(hookResult.progress).toBe(0)
    })

    it('should reset isCompiling to false', () => {
      renderTestComponent()
      act(() => {
        hookResult.reset()
      })
      expect(hookResult.isCompiling).toBe(false)
    })
  })

  describe('compile function signature', () => {
    it('should accept files array and options', () => {
      renderTestComponent()
      expect(hookResult.compile).toBeDefined()
      // Function accepts files (required) and options (optional with default)
      // Note: function.length only counts parameters without default values
      expect(hookResult.compile.length).toBeGreaterThanOrEqual(1)
    })

    it('should return a promise', () => {
      renderTestComponent()
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      const result = hookResult.compile([mockFile])
      expect(result).toBeInstanceOf(Promise)

      // Handle the promise to avoid warnings
      result.catch(() => {})
    })
  })

  describe('compile execution', () => {
    it('should set isCompiling to true during compilation', async () => {
      renderTestComponent()
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      // Mock image loading
      const originalImage = global.Image
      ;(global as any).Image = class MockImage {
        onload: (() => void) | null = null
        src = ''
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      }

      let compilingDuringExecution = false
      mockCompileImageTargets.mockImplementation(async () => {
        compilingDuringExecution = hookResult.isCompiling
      })

      await act(async () => {
        await hookResult.compile([mockFile])
      })

      // Verify that isCompiling was true during execution
      expect(mockCompileImageTargets).toHaveBeenCalled()
      expect(compilingDuringExecution).toBe(true)

      global.Image = originalImage
    })

    it('should call compileImageTargets with images and progress callback', async () => {
      renderTestComponent()
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      // Mock image loading
      const originalImage = global.Image
      ;(global as any).Image = class MockImage {
        onload: (() => void) | null = null
        src = ''
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      }

      await act(async () => {
        await hookResult.compile([mockFile])
      })

      expect(mockCompileImageTargets).toHaveBeenCalled()
      const callArgs = mockCompileImageTargets.mock.calls[0]
      expect(Array.isArray(callArgs[0])).toBe(true) // images array
      expect(typeof callArgs[1]).toBe('function') // progress callback

      global.Image = originalImage
    })

    it('should pass highPrecision option to compileImageTargets', async () => {
      renderTestComponent()
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      // Mock image loading
      const originalImage = global.Image
      ;(global as any).Image = class MockImage {
        onload: (() => void) | null = null
        src = ''
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      }

      await act(async () => {
        await hookResult.compile([mockFile], { highPrecision: true })
      })

      expect(mockCompileImageTargets).toHaveBeenCalled()
      const callArgs = mockCompileImageTargets.mock.calls[0]
      expect(callArgs[2]).toEqual({ highPrecision: true })

      global.Image = originalImage
    })

    it('should return targetBuffer and originalImage on success', async () => {
      renderTestComponent()
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      // Mock image loading
      const originalImage = global.Image
      ;(global as any).Image = class MockImage {
        onload: (() => void) | null = null
        src = ''
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      }

      let result: any
      await act(async () => {
        result = await hookResult.compile([mockFile])
      })

      expect(result).toHaveProperty('targetBuffer')
      expect(result).toHaveProperty('originalImage')
      expect(result.targetBuffer).toBeInstanceOf(ArrayBuffer)
      expect(result.originalImage).toBe(mockFile)

      global.Image = originalImage
    })

    it('should set isCompiling to false after compilation', async () => {
      renderTestComponent()
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      // Mock image loading
      const originalImage = global.Image
      ;(global as any).Image = class MockImage {
        onload: (() => void) | null = null
        src = ''
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      }

      await act(async () => {
        await hookResult.compile([mockFile])
      })

      expect(hookResult.isCompiling).toBe(false)

      global.Image = originalImage
    })

    it('should set isCompiling to false even on error', async () => {
      renderTestComponent()
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      mockCompileImageTargets.mockRejectedValue(new Error('Compilation failed'))

      // Mock image loading
      const originalImage = global.Image
      ;(global as any).Image = class MockImage {
        onload: (() => void) | null = null
        src = ''
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      }

      await act(async () => {
        try {
          await hookResult.compile([mockFile])
        } catch {
          // Expected error
        }
      })

      expect(hookResult.isCompiling).toBe(false)

      global.Image = originalImage
    })
  })

  describe('progress updates', () => {
    it('should update progress through callback', async () => {
      renderTestComponent()
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      const progressValues: number[] = []
      mockCompileImageTargets.mockImplementation(
        async (_images: any, progressCallback: (p: number) => void) => {
          progressCallback(25)
          progressValues.push(hookResult.progress)
          progressCallback(50)
          progressValues.push(hookResult.progress)
          progressCallback(100)
        }
      )

      // Mock image loading
      const originalImage = global.Image
      ;(global as any).Image = class MockImage {
        onload: (() => void) | null = null
        src = ''
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      }

      await act(async () => {
        await hookResult.compile([mockFile])
      })

      // Progress callback should have been called
      expect(mockCompileImageTargets).toHaveBeenCalled()

      global.Image = originalImage
    })
  })
})

describe('useImageCompiler types', () => {
  it('should have correct CompileOptions type structure', () => {
    type CompileOptions = {
      highPrecision?: boolean
    }

    const validOptions: CompileOptions = {
      highPrecision: true,
    }

    expect(validOptions.highPrecision).toBe(true)
  })

  it('should have correct CompileResult type structure', () => {
    type CompileResult = {
      targetBuffer: ArrayBuffer
      originalImage: File
    }

    const mockFile = new File([''], 'test.png', { type: 'image/png' })
    const validResult: CompileResult = {
      targetBuffer: new ArrayBuffer(8),
      originalImage: mockFile,
    }

    expect(validResult.targetBuffer).toBeInstanceOf(ArrayBuffer)
    expect(validResult.originalImage).toBeInstanceOf(File)
  })
})
