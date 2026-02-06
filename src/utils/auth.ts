import { API_URL } from '../config/api'

/**
 * 관리자 비밀번호 검증
 * @param password 검증할 비밀번호
 * @returns 비밀번호가 유효하면 true, 그렇지 않으면 false
 */
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/verify-password`, {
      method: 'POST',
      headers: {
        'X-Admin-Password': password,
      },
    })
    return res.ok
  } catch {
    return false
  }
}
