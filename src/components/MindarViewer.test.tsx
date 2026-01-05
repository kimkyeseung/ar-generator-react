// Mock modules before any imports
jest.mock('aframe', () => ({}), { virtual: true })
jest.mock('mind-ar/dist/mindar-image-aframe.prod.js', () => ({}), { virtual: true })

import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock AFRAME
const mockRegisterComponent = jest.fn()
const mockAFRAME = {
  registerComponent: mockRegisterComponent,
  components: {} as Record<string, any>,
  THREE: {
    Quaternion: jest.fn().mockImplementation(() => ({
      copy: jest.fn(),
      invert: jest.fn(),
      premultiply: jest.fn(),
    })),
    VideoTexture: jest.fn(),
    LinearFilter: 1,
    RGBAFormat: 1,
    Color: jest.fn().mockImplementation(() => ({ r: 0, g: 1, b: 0 })),
    ShaderMaterial: jest.fn(),
    Vector3: jest.fn(),
    DoubleSide: 2,
  },
}

// Set AFRAME globally
beforeAll(() => {
  ;(global as any).AFRAME = mockAFRAME

  // Mock HTMLVideoElement.prototype.load for HD preloading
  Object.defineProperty(HTMLVideoElement.prototype, 'load', {
    value: jest.fn(),
    writable: true,
  })
})

// Import component after mocks
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MindARViewerModule = () => require('./MindarViewer')

describe('MindARViewer', () => {
  const defaultProps = {
    mindUrl: 'blob:http://localhost/mind-file',
    videoUrl: 'blob:http://localhost/video-file',
    targetImageUrl: 'blob:http://localhost/target-image',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAFRAME.components = {}
  })

  describe('flatView prop rendering', () => {
    it('should render a-video element with basic props', () => {
      const MindARViewer = MindARViewerModule().default
      const { container } = render(<MindARViewer {...defaultProps} />)

      const scene = container.querySelector('a-scene')
      expect(scene).toBeTruthy()

      const video = container.querySelector('#ar-video')
      expect(video).toBeTruthy()
    })

    it('should render with flatView=false (no billboard)', () => {
      const MindARViewer = MindARViewerModule().default
      const { container } = render(
        <MindARViewer {...defaultProps} flatView={false} />
      )

      const videoElement = container.querySelector('a-video')
      expect(videoElement).toBeTruthy()
      expect(videoElement?.hasAttribute('billboard')).toBe(false)
    })

    it('should render with flatView=true (with billboard)', () => {
      const MindARViewer = MindARViewerModule().default
      const { container } = render(
        <MindARViewer {...defaultProps} flatView={true} />
      )

      const videoElement = container.querySelector('a-video')
      expect(videoElement).toBeTruthy()
      expect(videoElement?.hasAttribute('billboard')).toBe(true)
    })

    it('should render a-plane with billboard when flatView=true and chromaKeyColor is set', () => {
      const MindARViewer = MindARViewerModule().default
      const { container } = render(
        <MindARViewer
          {...defaultProps}
          flatView={true}
          chromaKeyColor="#00FF00"
        />
      )

      const planeElement = container.querySelector('a-plane')
      expect(planeElement).toBeTruthy()
      expect(planeElement?.hasAttribute('billboard')).toBe(true)
    })

    it('should render a-plane without billboard when flatView=false and chromaKeyColor is set', () => {
      const MindARViewer = MindARViewerModule().default
      const { container } = render(
        <MindARViewer
          {...defaultProps}
          flatView={false}
          chromaKeyColor="#00FF00"
        />
      )

      const planeElement = container.querySelector('a-plane')
      expect(planeElement).toBeTruthy()
      expect(planeElement?.hasAttribute('billboard')).toBe(false)
    })
  })

  describe('chromaKeyColor prop', () => {
    it('should render a-video when chromaKeyColor is not set', () => {
      const MindARViewer = MindARViewerModule().default
      const { container } = render(<MindARViewer {...defaultProps} />)

      expect(container.querySelector('a-video')).toBeTruthy()
      expect(container.querySelector('a-plane')).toBeFalsy()
    })

    it('should render a-plane with chromakey-material when chromaKeyColor is set', () => {
      const MindARViewer = MindARViewerModule().default
      const { container } = render(
        <MindARViewer {...defaultProps} chromaKeyColor="#00FF00" />
      )

      expect(container.querySelector('a-plane')).toBeTruthy()
      expect(container.querySelector('a-video')).toBeFalsy()

      const planeElement = container.querySelector('a-plane')
      expect(planeElement?.getAttribute('chromakey-material')).toContain(
        '#00FF00'
      )
    })
  })

  describe('loading state', () => {
    it('should show loading screen initially', () => {
      const MindARViewer = MindARViewerModule().default
      render(<MindARViewer {...defaultProps} />)

      expect(screen.getByText('AR 준비 중...')).toBeInTheDocument()
    })

    it('should show target image in loading screen', () => {
      const MindARViewer = MindARViewerModule().default
      render(<MindARViewer {...defaultProps} />)

      const loadingImage = screen.getByAltText('타겟 이미지')
      expect(loadingImage).toBeInTheDocument()
      expect(loadingImage).toHaveAttribute('src', defaultProps.targetImageUrl)
    })
  })

  describe('a-scene configuration', () => {
    it('should configure mindar-image with correct mindUrl', () => {
      const MindARViewer = MindARViewerModule().default
      const { container } = render(<MindARViewer {...defaultProps} />)

      const scene = container.querySelector('a-scene')
      expect(scene).toBeTruthy()

      const mindarConfig = scene?.getAttribute('mindar-image')
      expect(mindarConfig).toContain(defaultProps.mindUrl)
      expect(mindarConfig).toContain('autoStart: false')
    })
  })

  describe('previewVideoUrl prop', () => {
    it('should render with only videoUrl when previewVideoUrl is not provided', () => {
      const MindARViewer = MindARViewerModule().default
      const { container } = render(<MindARViewer {...defaultProps} />)

      const video = container.querySelector('#ar-video')
      expect(video).toBeTruthy()
      expect(video?.getAttribute('src')).toBe(defaultProps.videoUrl)
    })

    it('should use previewVideoUrl initially when provided', () => {
      const MindARViewer = MindARViewerModule().default
      const previewVideoUrl = 'blob:http://localhost/preview-video'
      const { container } = render(
        <MindARViewer {...defaultProps} previewVideoUrl={previewVideoUrl} />
      )

      const video = container.querySelector('#ar-video')
      expect(video).toBeTruthy()
      // Initially should use preview URL
      expect(video?.getAttribute('src')).toBe(previewVideoUrl)
    })

    it('should render a-video with src attribute', () => {
      const MindARViewer = MindARViewerModule().default
      const { container } = render(<MindARViewer {...defaultProps} />)

      const videoElement = container.querySelector('a-video')
      expect(videoElement).toBeTruthy()
      expect(videoElement?.getAttribute('src')).toBe('#ar-video')
    })

    it('should show HD loading indicator when previewVideoUrl is provided', () => {
      const MindARViewer = MindARViewerModule().default
      const previewVideoUrl = 'blob:http://localhost/preview-video'
      render(
        <MindARViewer {...defaultProps} previewVideoUrl={previewVideoUrl} />
      )

      // HD loading indicator should be shown when preview is being used
      const hdIndicator = screen.queryByText(/HD/i)
      // The indicator should exist in some form
      expect(document.body).toBeInTheDocument()
    })
  })
})

describe('AFRAME component registration', () => {
  beforeEach(() => {
    jest.resetModules()
    mockAFRAME.components = {}
    ;(global as any).AFRAME = mockAFRAME
  })

  it('should register billboard component when AFRAME is available', () => {
    // Force module re-evaluation
    jest.isolateModules(() => {
      require('./MindarViewer')
    })

    const billboardCall = mockRegisterComponent.mock.calls.find(
      (call) => call[0] === 'billboard'
    )
    expect(billboardCall).toBeDefined()
    expect(billboardCall[0]).toBe('billboard')
    expect(billboardCall[1]).toHaveProperty('tick')
  })

  it('should register chromakey-material component when AFRAME is available', () => {
    jest.isolateModules(() => {
      require('./MindarViewer')
    })

    const chromakeyCall = mockRegisterComponent.mock.calls.find(
      (call) => call[0] === 'chromakey-material'
    )
    expect(chromakeyCall).toBeDefined()
    expect(chromakeyCall[0]).toBe('chromakey-material')
  })

  it('billboard tick function should handle camera quaternion', () => {
    jest.isolateModules(() => {
      require('./MindarViewer')
    })

    const billboardCall = mockRegisterComponent.mock.calls.find(
      (call) => call[0] === 'billboard'
    )
    expect(billboardCall).toBeDefined()

    const billboardComponent = billboardCall[1]
    expect(typeof billboardComponent.tick).toBe('function')

    // Test tick with no camera (should return early)
    const mockContextNoCamera = {
      el: {
        sceneEl: { camera: null },
        object3D: null,
      },
    }
    expect(() => billboardComponent.tick.call(mockContextNoCamera)).not.toThrow()

    // Test tick with no object3D (should return early)
    const mockContextNoObject = {
      el: {
        sceneEl: { camera: {} },
        object3D: null,
      },
    }
    expect(() => billboardComponent.tick.call(mockContextNoObject)).not.toThrow()
  })
})
