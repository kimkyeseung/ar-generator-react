// Mock canvas module for Jest tests
module.exports = {
  createCanvas: jest.fn(() => ({
    getContext: jest.fn(() => ({
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
    })),
    toBuffer: jest.fn(),
    toDataURL: jest.fn(),
    width: 0,
    height: 0,
  })),
  loadImage: jest.fn(),
  Image: jest.fn(),
}
