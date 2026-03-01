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
