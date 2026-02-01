/**
 * AR 프로젝션 관련 유틸리티 함수
 * 카메라 해상도와 트래킹 해상도 간의 변환을 처리
 */

export interface TrackingDimensions {
  trackingWidth: number
  trackingHeight: number
}

export interface VideoDimensions {
  videoWidth: number
  videoHeight: number
}

export interface ContainerDimensions {
  clientWidth: number
  clientHeight: number
}

export interface DisplayDimensions {
  vw: number // display css width
  vh: number // display css height
}

/**
 * 트래킹 해상도 계산
 * 카메라 해상도가 FHD를 초과하면 성능 최적화를 위해 FHD로 제한
 */
export function calculateTrackingDimensions(
  videoWidth: number,
  videoHeight: number,
  maxTrackingWidth: number = 1920,
  maxTrackingHeight: number = 1080
): TrackingDimensions {
  const aspectRatio = videoWidth / videoHeight

  if (videoWidth > maxTrackingWidth || videoHeight > maxTrackingHeight) {
    if (aspectRatio > maxTrackingWidth / maxTrackingHeight) {
      return {
        trackingWidth: maxTrackingWidth,
        trackingHeight: Math.round(maxTrackingWidth / aspectRatio),
      }
    } else {
      return {
        trackingHeight: maxTrackingHeight,
        trackingWidth: Math.round(maxTrackingHeight * aspectRatio),
      }
    }
  }

  return {
    trackingWidth: videoWidth,
    trackingHeight: videoHeight,
  }
}

/**
 * 비디오 디스플레이 크기 계산
 * 컨테이너에 맞게 비디오를 cover 방식으로 표시
 */
export function calculateDisplayDimensions(
  video: VideoDimensions,
  container: ContainerDimensions
): DisplayDimensions {
  const videoRatio = video.videoWidth / video.videoHeight
  const containerRatio = container.clientWidth / container.clientHeight

  if (videoRatio > containerRatio) {
    const vh = container.clientHeight
    return { vw: vh * videoRatio, vh }
  } else {
    const vw = container.clientWidth
    return { vw, vh: vw / videoRatio }
  }
}

/**
 * 트래킹/비디오 해상도 스케일 비율 계산
 * 프로젝션 매트릭스 보정에 사용
 */
export function calculateTrackingScale(
  trackingHeight: number,
  videoHeight: number
): number {
  return trackingHeight / videoHeight
}

/**
 * FOV(Field of View) 계산
 * 프로젝션 매트릭스와 디스플레이 크기, 트래킹 스케일을 기반으로 계산
 *
 * @param projectionMatrix - MindAR Controller의 프로젝션 매트릭스 (16 요소 배열)
 * @param displayHeight - 비디오 디스플레이 높이 (vh)
 * @param containerHeight - 컨테이너 높이
 * @param trackingScale - 트래킹/비디오 해상도 비율
 * @returns FOV in degrees
 */
export function calculateFOV(
  projectionMatrix: number[],
  displayHeight: number,
  containerHeight: number,
  trackingScale: number = 1
): number {
  // proj[5]는 프로젝션 매트릭스의 (1,1) 요소 = 2*f/height
  const proj5 = projectionMatrix[5]

  // 트래킹 스케일로 디스플레이 높이 보정
  const scaledVh = displayHeight * trackingScale

  // FOV 계산: 2 * atan(1 / (proj[5] * scaledVh) * containerHeight) * 180 / PI
  const fov = (2 * Math.atan((1 / proj5 / scaledVh) * containerHeight) * 180) / Math.PI

  return fov
}

/**
 * 프로젝션 매트릭스에서 near/far plane 추출
 */
export function extractNearFar(projectionMatrix: number[]): { near: number; far: number } {
  const proj10 = projectionMatrix[10]
  const proj14 = projectionMatrix[14]

  const near = proj14 / (proj10 - 1.0)
  const far = proj14 / (proj10 + 1.0)

  return { near, far }
}
