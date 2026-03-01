/**
 * MindAR 뷰어 관련 타입 정의
 */

type OneEuroFilter = {
  minCutOff: number
  beta: number
  reset: () => void
}

type TrackingState = {
  showing: boolean
  isTracking: boolean
  filter: OneEuroFilter
}

export type MindARController = {
  filterMinCF: number
  filterBeta: number
  trackingStates: TrackingState[]
}

export type MindARSystem = {
  start: () => void
  stop: () => void
  controller?: MindARController
}

export type MindARScene = HTMLElement & {
  systems: {
    ['mindar-image-system']?: MindARSystem
  }
}
