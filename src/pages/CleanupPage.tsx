import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageBackground from '../components/home/PageBackground'
import { Button } from '../components/ui/button'
import { API_URL } from '../config/api'

interface CleanupResult {
  message: string
  totalProjects: number
  totalDeleted: number
  details: {
    folderId: string
    deleted: number
    errors: string[]
  }[]
}

export default function CleanupPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CleanupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCleanup = async () => {
    if (!password) {
      setError('비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`${API_URL}/projects/cleanup`, {
        method: 'POST',
        headers: {
          'X-Admin-Password': password,
        },
      })

      if (res.status === 401) {
        setError('비밀번호가 올바르지 않습니다.')
        return
      }

      if (!res.ok) {
        throw new Error(`요청 실패: ${res.status}`)
      }

      const data: CleanupResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageBackground>
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              ← 목록으로
            </Button>
          </div>

          <div className="rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">
              Google Drive 정리
            </h1>

            <p className="text-sm text-gray-600 mb-6">
              각 프로젝트 폴더에서 DB에 등록되지 않은 찌꺼기 파일들을 삭제합니다.
            </p>

            {/* 비밀번호 입력 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                관리자 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleCleanup()}
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* 실행 버튼 */}
            <Button
              onClick={handleCleanup}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            >
              {isLoading ? '정리 중...' : '찌꺼기 파일 정리 실행'}
            </Button>

            {/* 결과 표시 */}
            {result && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">
                  {result.message}
                </h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p>처리된 프로젝트: {result.totalProjects}개</p>
                  <p>삭제된 파일: {result.totalDeleted}개</p>
                </div>

                {result.details.some((d) => d.deleted > 0 || d.errors.length > 0) && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">상세 내역</h4>
                    <div className="space-y-2">
                      {result.details
                        .filter((d) => d.deleted > 0 || d.errors.length > 0)
                        .map((detail) => (
                          <div
                            key={detail.folderId}
                            className="text-xs bg-white p-2 rounded border"
                          >
                            <span className="font-mono text-gray-500">
                              {detail.folderId.slice(0, 12)}...
                            </span>
                            <span className="ml-2 text-green-600">
                              삭제: {detail.deleted}
                            </span>
                            {detail.errors.length > 0 && (
                              <span className="ml-2 text-red-600">
                                오류: {detail.errors.length}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageBackground>
  )
}
