/**
 * 크로마키 처리 유틸리티
 */

export interface RgbColor {
  r: number
  g: number
  b: number
}

/**
 * HEX 색상 코드를 RGB 객체로 변환
 * @param hex - HEX 색상 코드 (예: '#00FF00' 또는 '00FF00')
 * @returns RGB 객체 { r, g, b } (각 값은 0-255 범위)
 */
export function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 255, b: 0 } // 기본값: 녹색
}

/**
 * 유효한 HEX 색상 코드인지 확인
 * @param color - 검사할 색상 문자열
 * @returns 유효한 HEX 색상이면 true
 */
export function isValidHexColor(color: string | undefined | null): color is string {
  if (!color) return false
  return /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.test(color)
}

/**
 * 크로마키 색상 거리 계산 (유클리드 거리)
 * @param r1, g1, b1 - 첫 번째 색상의 RGB 값
 * @param r2, g2, b2 - 두 번째 색상의 RGB 값
 * @returns 0-441 범위의 거리 값 (0이면 동일한 색상)
 */
export function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
  )
}

/**
 * 크로마키 알파 값 계산
 * @param distance - 색상 거리
 * @param similarity - 유사도 임계값 (0-1, 높을수록 더 넓은 범위 제거)
 * @param smoothness - 경계 부드러움 (0-0.5, 높을수록 부드러운 경계)
 * @returns 0-255 범위의 알파 값 (0이면 완전 투명)
 */
export function calculateChromaKeyAlpha(
  distance: number,
  similarity: number,
  smoothness: number
): number {
  // 거리를 0-1 범위로 정규화 (최대 거리 ~441)
  const normalizedDistance = distance / 441

  // similarity와 smoothness를 사용하여 알파 계산
  const threshold = similarity
  const edge = smoothness

  if (normalizedDistance < threshold) {
    return 0 // 완전 투명
  } else if (normalizedDistance < threshold + edge) {
    // 부드러운 경계
    return Math.round(((normalizedDistance - threshold) / edge) * 255)
  } else {
    return 255 // 완전 불투명
  }
}
