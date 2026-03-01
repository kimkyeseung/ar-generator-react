/**
 * 카메라 관련 유틸리티
 */

import { CameraResolution } from '../types/project'

interface Resolution {
  width: number
  height: number
}

/**
 * 카메라 해상도 설정 맵
 */
const CAMERA_RESOLUTION_MAP: Record<CameraResolution, Resolution> = {
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
 * iOS 디바이스 감지
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
