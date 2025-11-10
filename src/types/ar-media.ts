import type { DotLottieAnimation } from '../lib/dotlottie'

export type VideoMediaAsset = {
  kind: 'video'
  url: string
}

export type LottieMediaAsset = {
  kind: 'lottie'
  animation: DotLottieAnimation
}

export type ArMediaAsset = VideoMediaAsset | LottieMediaAsset
