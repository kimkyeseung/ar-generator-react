// Manual mock for canvas module
// This mock is used because the native canvas module fails on some platforms
module.exports = {
  createCanvas: function(width, height) {
    return {
      getContext: function() {
        return {
          fillStyle: '',
          fillRect: function() {},
          drawImage: function() {},
          getImageData: function() { return { data: new Uint8ClampedArray() } },
          putImageData: function() {},
          createImageData: function() { return { data: new Uint8ClampedArray() } },
          save: function() {},
          restore: function() {},
          translate: function() {},
          scale: function() {},
        }
      },
      toBuffer: function() { return Buffer.from([]) },
      toDataURL: function() { return '' },
      width: width || 0,
      height: height || 0,
    }
  },
  loadImage: function() { return Promise.resolve({}) },
  Image: function() {},
}
