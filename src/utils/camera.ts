/**
 * 카메라 관련 유틸리티
 */

import { CameraResolution } from '../types/project'

export interface Resolution {
  width: number
  height: number
}

/**
 * 카메라 해상도 설정 맵
 */
export const CAMERA_RESOLUTION_MAP: Record<CameraResolution, Resolution> = {
  fhd: { width: 1920, height: 1080 },
  hd: { width: 1280, height: 720 },
}

/**
 * CameraResolution 타입에서 실제 해상도 값 가져오기
 * @param resolution - 'fhd' | 'hd'
 * @returns { width, height } 객체
 */
export function getCameraResolution(resolution: CameraResolution): Resolution {
  return CAMERA_RESOLUTION_MAP[resolution] || CAMERA_RESOLUTION_MAP.fhd
}

/**
 * 카메라 스트림 가져오기
 * @param resolution - 원하는 해상도
 * @param facingMode - 카메라 방향 ('environment' = 후면, 'user' = 전면)
 * @returns MediaStream
 */
export async function getCameraStream(
  resolution: CameraResolution = 'fhd',
  facingMode: 'environment' | 'user' = 'environment'
): Promise<MediaStream> {
  const { width, height } = getCameraResolution(resolution)

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode,
      width: { ideal: width },
      height: { ideal: height },
    },
    audio: false,
  })
}

/**
 * iOS 디바이스 감지
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
