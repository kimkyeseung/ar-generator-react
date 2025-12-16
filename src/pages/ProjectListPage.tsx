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
      <div className='container mx-auto px-4 py-12'>
        <div className='mx-auto max-w-4xl space-y-8'>
          <HeroHeader />

          <div className='flex justify-between items-center'>
            <h2 className='text-2xl font-bold text-white'>내 프로젝트</h2>
            <Button
              onClick={() => navigate('/create')}
              className='bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
            >
              + 새 프로젝트 만들기
            </Button>
          </div>

          {isLoading ? (
            <div className='text-center py-12'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto'></div>
              <p className='text-white/70 mt-4'>로딩 중...</p>
            </div>
          ) : error ? (
            <Card className='p-8 text-center bg-red-500/10 border-red-500/30'>
              <p className='text-red-400'>{error}</p>
              <Button
                onClick={fetchProjects}
                variant='outline'
                className='mt-4'
              >
                다시 시도
              </Button>
            </Card>
          ) : projects.length === 0 ? (
            <Card className='p-12 text-center bg-white/5 border-white/10'>
              <div className='text-6xl mb-4'>🎨</div>
              <h3 className='text-xl font-semibold text-white mb-2'>
                아직 프로젝트가 없습니다
              </h3>
              <p className='text-white/60 mb-6'>
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
            <div className='grid gap-4'>
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className='p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-colors'
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex-1'>
                      <h3 className='text-lg font-semibold text-white'>
                        {project.title || '제목 없음'}
                      </h3>
                      <p className='text-white/50 text-sm mt-1'>
                        생성일: {formatDate(project.createdAt)}
                      </p>
                      {project.description && (
                        <p className='text-white/70 text-sm mt-2'>
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className='flex gap-2 ml-4'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => navigate(`/result/qr/${project.folderId}`)}
                        className='text-white border-white/30 hover:bg-white/10'
                      >
                        QR 보기
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => navigate(`/result/${project.folderId}`)}
                        className='text-white border-white/30 hover:bg-white/10'
                      >
                        AR 보기
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleDelete(project.id)}
                        className='text-red-400 border-red-400/30 hover:bg-red-500/10'
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
