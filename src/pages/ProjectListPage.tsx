import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import PageBackground from '../components/home/PageBackground'
import HeroHeader from '../components/home/HeroHeader'
import { Project } from '../types/project'

const API_URL = process.env.REACT_APP_API_URL

export default function ProjectListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${API_URL}/projects`)
      if (!res.ok) throw new Error('프로젝트 목록을 불러오는데 실패했습니다.')
      const data = await res.json()
      setProjects(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '오류가 발생했습니다.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('삭제에 실패했습니다.')
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <PageBackground>
      <div className='container mx-auto px-4 py-6 sm:py-12'>
        <div className='mx-auto max-w-4xl space-y-6 sm:space-y-8'>
          <HeroHeader />

          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
            <h2 className='text-xl sm:text-2xl font-bold text-gray-800'>내 프로젝트</h2>
            <Button
              onClick={() => navigate('/create')}
              className='w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
            >
              + 새 프로젝트 만들기
            </Button>
          </div>

          {isLoading ? (
            <div className='text-center py-12'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto'></div>
              <p className='text-gray-600 mt-4'>로딩 중...</p>
            </div>
          ) : error ? (
            <Card className='p-8 text-center bg-red-50 border-red-200'>
              <p className='text-red-600'>{error}</p>
              <Button
                onClick={fetchProjects}
                variant='outline'
                className='mt-4'
              >
                다시 시도
              </Button>
            </Card>
          ) : projects.length === 0 ? (
            <Card className='p-12 text-center bg-white shadow-lg border-gray-200'>
              <div className='text-6xl mb-4'>🎨</div>
              <h3 className='text-xl font-semibold text-gray-800 mb-2'>
                아직 프로젝트가 없습니다
              </h3>
              <p className='text-gray-500 mb-6'>
                첫 번째 AR 프로젝트를 만들어보세요!
              </p>
              <Button
                onClick={() => navigate('/create')}
                className='bg-gradient-to-r from-purple-500 to-pink-500'
              >
                프로젝트 만들기
              </Button>
            </Card>
          ) : (
            <div className='grid gap-3 sm:gap-4'>
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className='p-4 sm:p-6 bg-white shadow-md border-gray-200 hover:shadow-lg transition-shadow'
                >
                  <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
                    {/* 썸네일 + 정보 영역 */}
                    <div className='flex items-start sm:items-center gap-3 sm:gap-4 flex-1'>
                      {/* 썸네일 이미지 */}
                      <div className='flex-shrink-0'>
                        {project.targetImageFileId ? (
                          <img
                            src={`${API_URL}/file/${project.targetImageFileId}`}
                            alt='타겟 이미지'
                            className='w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200'
                          />
                        ) : (
                          <div className='w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200'>
                            <span className='text-xl sm:text-2xl'>🎯</span>
                          </div>
                        )}
                      </div>
                      {/* 프로젝트 정보 */}
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-base sm:text-lg font-semibold text-gray-800 truncate'>
                          {project.title || '제목 없음'}
                        </h3>
                        <p className='text-gray-400 text-xs sm:text-sm mt-0.5'>
                          {formatDate(project.createdAt)}
                        </p>
                        {/* 뱃지들 */}
                        <div className='flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2'>
                          {project.height && (
                            <span className='text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap'>
                              {project.height > 1 ? '세로' : project.height < 1 ? '가로' : '정방형'}
                            </span>
                          )}
                          {project.chromaKeyColor && (
                            <span className='text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1'>
                              <span
                                className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-green-300'
                                style={{ backgroundColor: project.chromaKeyColor }}
                              />
                              크로마키
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className='text-gray-600 text-xs sm:text-sm mt-2 line-clamp-2'>
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* 버튼 영역 */}
                    <div className='flex flex-wrap sm:flex-nowrap gap-2 sm:ml-4'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => navigate(`/edit/${project.id}`)}
                        className='flex-1 sm:flex-none text-xs sm:text-sm text-gray-600 border-gray-300 hover:bg-gray-50'
                      >
                        편집
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => navigate(`/result/qr/${project.folderId}`)}
                        className='flex-1 sm:flex-none text-xs sm:text-sm text-purple-600 border-purple-300 hover:bg-purple-50'
                      >
                        QR
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => navigate(`/result/${project.folderId}`)}
                        className='flex-1 sm:flex-none text-xs sm:text-sm text-indigo-600 border-indigo-300 hover:bg-indigo-50'
                      >
                        AR
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleDelete(project.id)}
                        className='flex-1 sm:flex-none text-xs sm:text-sm text-red-500 border-red-300 hover:bg-red-50'
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageBackground>
  )
}
