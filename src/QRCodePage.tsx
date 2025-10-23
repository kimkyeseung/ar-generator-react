import { useEffect, useRef } from 'react'
import { Button } from './components/ui/button'
import { ArrowLeft, Download } from 'lucide-react'
import QRCode from 'qrcode'
import { useNavigate, useParams, useLocation } from 'react-router-dom'

export function QRCodePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { folderId } = useParams<{ folderId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const fullUrl = `${window.location.origin}${location.pathname}${location.search}${location.hash}`

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, fullUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
    }
  }, [fullUrl])

  const handleDownload = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = 'ar-qrcode.png'
      link.href = url
      link.click()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로 가기
        </Button>

        <div className="text-center">
          <h1 className="text-gray-900 mb-2">게시 완료!</h1>
          <p className="text-gray-600 mb-8">
            QR 코드를 스캔하여 AR 콘텐츠를 확인하세요
          </p>

          <div className="flex justify-center mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <canvas ref={canvasRef} className="mx-auto" />
            </div>
          </div>

          {/* <div className="space-y-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Target Image</p>
              <p className="text-gray-900">{targetFile?.name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Video Content</p>
              <p className="text-gray-900">{videoFile?.name}</p>
            </div>
          </div> */}

          <Button
            onClick={() => {
              navigate(`/result/${folderId}`)
            }}
            className="w-full"
          >
            이동하기
          </Button>

          <Button variant={'outline'} onClick={handleDownload}>
            <Download />
            다운로드
          </Button>

          <p className="text-sm text-gray-500 mt-4 break-all">{fullUrl}</p>
        </div>
      </div>
    </div>
  )
}
