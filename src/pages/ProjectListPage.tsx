import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HeroHeader from '../components/home/HeroHeader'
import PageBackground from '../components/home/PageBackground'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
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
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
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

          <div className='flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center'>
            <h2 className='text-xl font-bold text-gray-800 sm:text-2xl'>
              내 프로젝트
            </h2>
            <Button
              onClick={() => navigate('/create')}
              className='w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 sm:w-auto'
            >
              + 새 프로젝트 만들기
            </Button>
          </div>

          {isLoading ? (
            <div className='py-12 text-center'>
              <div className='mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600'></div>
              <p className='mt-4 text-gray-600'>로딩 중...</p>
            </div>
          ) : error ? (
            <Card className='border-red-200 bg-red-50 p-8 text-center'>
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
            <Card className='border-gray-200 bg-white p-12 text-center shadow-lg'>
              <div className='mb-4 text-6xl'>🎨</div>
              <h3 className='mb-2 text-xl font-semibold text-gray-800'>
                아직 프로젝트가 없습니다
              </h3>
              <p className='mb-6 text-gray-500'>
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
                  className='border-gray-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg sm:p-6'
                >
                  <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
                    {/* 썸네일 + 정보 영역 */}
                    <div className='flex flex-1 items-start gap-3 sm:items-center sm:gap-4'>
                      {/* 타겟 이미지 썸네일 */}
                      <div className='flex-shrink-0'>
                        {project.targetImageFileId ? (
                          <img
                            src={`${API_URL}/file/${project.targetImageFileId}`}
                            alt='타겟 이미지'
                            className='h-16 w-16 rounded-lg border border-gray-200 object-cover sm:h-20 sm:w-20'
                          />
                        ) : (
                          <div className='flex h-16 w-16 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 sm:h-20 sm:w-20'>
                            <span className='text-xl sm:text-2xl'>🎯</span>
                          </div>
                        )}
                      </div>
                      {/* 비디오 썸네일 */}
                      <div className='flex-shrink-0'>
                        {project.videoFileId ? (
                          <video
                            src={`${API_URL}/file/${project.videoFileId}`}
                            className='h-16 w-16 rounded-lg border border-gray-200 object-cover sm:h-20 sm:w-20'
                            muted
                            preload='metadata'
                          />
                        ) : (
                          <div className='flex h-16 w-16 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 sm:h-20 sm:w-20'>
                            <span className='text-xl sm:text-2xl'>🎬</span>
                          </div>
                        )}
                      </div>
                      {/* 프로젝트 정보 */}
                      <div className='min-w-0 flex-1'>
                        <h3 className='truncate text-base font-semibold text-gray-800 sm:text-lg'>
                          {project.title || '제목 없음'}
                        </h3>
                        <p className='mt-0.5 text-xs text-gray-400 sm:text-sm'>
                          {formatDate(project.createdAt)}
                        </p>
                        {/* 뱃지들 */}
                        <div className='mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2'>
                          {project.chromaKeyColor && (
                            <span className='flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700 sm:px-2 sm:text-xs'>
                              <span
                                className='h-2.5 w-2.5 rounded-full border border-green-300 sm:h-3 sm:w-3'
                                style={{
                                  backgroundColor: project.chromaKeyColor,
                                }}
                              />
                              크로마키
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className='mt-2 line-clamp-2 text-xs text-gray-600 sm:text-sm'>
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* 버튼 영역 */}
                    <div className='flex flex-wrap gap-2 sm:ml-4 sm:flex-nowrap'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => navigate(`/edit/${project.id}`)}
                        className='flex-1 border-gray-300 text-xs text-gray-600 hover:bg-gray-50 sm:flex-none sm:text-sm'
                      >
                        편집
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          navigate(`/result/qr/${project.folderId}`)
                        }
                        className='flex-1 border-purple-300 text-xs text-purple-600 hover:bg-purple-50 sm:flex-none sm:text-sm'
                      >
                        QR
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => navigate(`/result/${project.folderId}`)}
                        className='flex-1 border-indigo-300 text-xs text-indigo-600 hover:bg-indigo-50 sm:flex-none sm:text-sm'
                      >
                        AR
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleDelete(project.id)}
                        className='flex-1 border-red-300 text-xs text-red-500 hover:bg-red-50 sm:flex-none sm:text-sm'
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
