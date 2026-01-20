import { resize } from './utils/images.js'

const MIN_IMAGE_PIXEL_SIZE = 100

// Build a list of image {data, width, height, scale} with different scales
const buildImageList = (inputImage, options = {}) => {
  const { highPrecision = false } = options
  const minScale =
    MIN_IMAGE_PIXEL_SIZE / Math.min(inputImage.width, inputImage.height)

  const scaleList = []
  let c = minScale
  // highPrecision: 1/4 옥타브 간격 (더 많은 스케일 레벨)
  // normal: 1/3 옥타브 간격
  const scaleFactor = highPrecision ? Math.pow(2.0, 1.0 / 4.0) : Math.pow(2.0, 1.0 / 3.0)
  while (true) {
    scaleList.push(c)
    c *= scaleFactor
    if (c >= 0.95) {
      c = 1
      break
    }
  }
  scaleList.push(c)
  scaleList.reverse()

  const imageList = []
  for (let i = 0; i < scaleList.length; i++) {
    imageList.push(
      Object.assign(resize({ image: inputImage, ratio: scaleList[i] }), {
        scale: scaleList[i],
      })
    )
  }
  return imageList
}

const buildTrackingImageList = (inputImage, options = {}) => {
  const { highPrecision = false } = options
  const minDimension = Math.min(inputImage.width, inputImage.height)
  const scaleList = []
  const imageList = []
  // highPrecision: 추가 스케일 레벨 (512, 256, 128)
  // normal: 기본 스케일 레벨 (256, 128)
  if (highPrecision) {
    scaleList.push(512.0 / minDimension)
  }
  scaleList.push(256.0 / minDimension)
  scaleList.push(128.0 / minDimension)
  for (let i = 0; i < scaleList.length; i++) {
    imageList.push(
      Object.assign(resize({ image: inputImage, ratio: scaleList[i] }), {
        scale: scaleList[i],
      })
    )
  }
  return imageList
}

export { buildImageList, buildTrackingImageList }
