/**
 * 유효한 hex 색상인지 검증
 * @param color - 검증할 색상 문자열 (예: #FF0000, #F00)
 * @returns 유효한 hex 색상이면 true
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

/**
 * URL에 프로토콜이 없으면 https://를 추가
 * @param url - 정규화할 URL 문자열
 * @returns 프로토콜이 포함된 URL (빈 문자열이면 빈 문자열 반환)
 */
export function normalizeUrl(url: string | undefined | null): string {
  if (!url || !url.trim()) return ''
  const trimmed = url.trim()
  // 이미 프로토콜이 있으면 그대로 반환
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  // 프로토콜이 없으면 https:// 추가
  return `https://${trimmed}`
}
