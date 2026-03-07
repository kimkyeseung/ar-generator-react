import { useEffect } from 'react'
import { Button } from './ui/button'

interface MonthlyData {
  year: number
  month: number
  count: number
}

interface AccessStats {
  projectId: string
  title: string | null
  total: number
  monthly: MonthlyData[]
}

interface AccessStatsModalProps {
  isOpen: boolean
  onClose: () => void
  stats: AccessStats | null
  isLoading: boolean
}

export default function AccessStatsModal({
  isOpen,
  onClose,
  stats,
  isLoading,
}: AccessStatsModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* 배경 오버레이 */}
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* 모달 콘텐츠 */}
      <div className='relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6'>
        <h2 className='text-xl font-semibold text-gray-900 mb-1'>
          접속 통계
        </h2>
        {stats && (
          <p className='text-sm text-gray-500 mb-4 truncate'>
            {stats.title || '제목 없음'}
          </p>
        )}

        {isLoading ? (
          <div className='py-8 text-center'>
            <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600'></div>
            <p className='mt-3 text-sm text-gray-500'>통계 불러오는 중...</p>
          </div>
        ) : stats ? (
          <>
            {/* 총 접속 수 */}
            <div className='mb-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-4 text-center'>
              <p className='text-sm text-gray-500'>총 접속 수</p>
              <p className='text-3xl font-bold text-purple-700'>
                {stats.total.toLocaleString()}
              </p>
            </div>

            {/* 월별 통계 */}
            {stats.monthly.length > 0 ? (
              <div className='max-h-64 overflow-y-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-gray-200 text-gray-500'>
                      <th className='pb-2 text-left font-medium'>기간</th>
                      <th className='pb-2 text-right font-medium'>접속 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.monthly.map((row) => (
                      <tr
                        key={`${row.year}-${row.month}`}
                        className='border-b border-gray-100'
                      >
                        <td className='py-2.5 text-gray-700'>
                          {row.year}년 {row.month}월
                        </td>
                        <td className='py-2.5 text-right font-medium text-gray-900'>
                          {row.count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className='py-6 text-center text-sm text-gray-400'>
                아직 접속 기록이 없습니다.
              </p>
            )}
          </>
        ) : null}

        <div className='mt-4'>
          <Button
            variant='outline'
            onClick={onClose}
            className='w-full'
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}
