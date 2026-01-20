// Mock offline-compiler to avoid canvas dependency in tests
export class OfflineCompiler {
  createProcessCanvas() {
    return {
      getContext: jest.fn(() => ({
        fillRect: jest.fn(),
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
      })),
      width: 0,
      height: 0,
    }
  }

  compileTrack() {
    return Promise.resolve([])
  }
}
