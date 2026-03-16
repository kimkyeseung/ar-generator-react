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
 * 크로마키 사전 계산 상수 (루프 밖에서 한 번만 계산)
 */
export interface ChromaKeyConstants {
  kr: number
  kg: number
  kb: number
  inv255: number
  simSq3: number
  smoothBoundSq3: number
  similarity: number
  smoothness: number
  invSmoothness: number
  sqrt3: number
}

/**
 * 크로마키 처리에 필요한 상수들을 사전 계산
 * 매 프레임 반복 계산을 피하기 위해 루프 밖에서 호출
 */
export function precomputeChromaKeyConstants(
  keyColor: RgbColor,
  similarity: number,
  smoothness: number,
): ChromaKeyConstants {
  const smoothBound = similarity + smoothness
  return {
    kr: keyColor.r,
    kg: keyColor.g,
    kb: keyColor.b,
    inv255: 1 / 255,
    simSq3: similarity * similarity * 3,
    smoothBoundSq3: smoothBound * smoothBound * 3,
    similarity,
    smoothness,
    invSmoothness: smoothness > 0 ? 1 / smoothness : 0,
    sqrt3: Math.sqrt(3),
  }
}

/**
 * ImageData에 크로마키 처리를 적용 (in-place)
 * 제곱 거리 비교로 대부분의 픽셀에서 Math.sqrt를 생략하는 최적화 적용
 */
export function applyChromaKey(data: Uint8ClampedArray, constants: ChromaKeyConstants): void {
  const { kr, kg, kb, inv255, simSq3, smoothBoundSq3, similarity, invSmoothness, sqrt3 } = constants

  for (let i = 0; i < data.length; i += 4) {
    const dr = (data[i] - kr) * inv255
    const dg = (data[i + 1] - kg) * inv255
    const db = (data[i + 2] - kb) * inv255
    const distSq3 = dr * dr + dg * dg + db * db

    if (distSq3 < simSq3) {
      data[i + 3] = 0
    } else if (distSq3 < smoothBoundSq3) {
      // 전환 영역 픽셀만 sqrt 계산 (전체의 소수)
      const distance = Math.sqrt(distSq3) / sqrt3
      data[i + 3] = Math.round((distance - similarity) * invSmoothness * 255)
    }
  }
}
