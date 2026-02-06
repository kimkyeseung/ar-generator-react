/**
 * 유효한 hex 색상인지 검증
 * @param color - 검증할 색상 문자열 (예: #FF0000, #F00)
 * @returns 유효한 hex 색상이면 true
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}
