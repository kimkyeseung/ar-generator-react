import { useCallback, useState } from 'react'
import { FileUpload } from './FileUpload'
import { Button } from './ui/button'
import { Sparkles } from 'lucide-react'
import MindARCompiler from './MindARCompiler'
import { useNavigate } from 'react-router-dom'
import { Progress } from './ui/progress'

const stepMessageMap = {
  1: 'Step 1. 타겟 이미지를 업로드해주세요.',
  2: 'Step 2. 타겟에 재생될 영상을 업로드해주세요',
}

const API_URL = process.env.REACT_APP_API_URL

export default function App() {
  const [step, setStep] = useState<1 | 2>(1)
  const [progress, setProgress] = useState<number>(0)
  const navigate = useNavigate()
  const [targetFile, setTargetFile] = useState<ArrayBuffer | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const handleVideoSelect = useCallback((input: File | File[] | null) => {
    if (Array.isArray(input)) {
      setVideoFile(input[0] ?? null)
    } else {
      setVideoFile(input)
    }
  }, [])

  const canPublish = targetFile !== null && videoFile !== null

  const handlePublish = async () => {
    if (canPublish) {
      const formData = new FormData()
      const blob = new Blob([targetFile], { type: 'application/octet-stream' })
      formData.append('target', blob, 'targets.mind')
      formData.append('video', videoFile)

      const res = await uploadWithProgress(formData)
      navigate(`/result/qr/${res.folderId}`)
    }
  }

  // 업로드 (진행률 표시용: XMLHttpRequest 사용)
  const uploadWithProgress = async (formData: FormData) => {
    setProgress(0)
    return await new Promise<{
      folderId: string
      targetFileId: string
      videoFileId: string
    }>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.open('POST', `${API_URL}/upload`)
      xhr.responseType = 'json'

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100)
          setProgress(pct)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100)
          resolve(xhr.response)
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.send(formData)
    })
  }

  const handleComplieComplete = (target: ArrayBuffer) => {
    setTargetFile(target)
    setStep(2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-indigo-600" />
              <h1 className="text-gray-900 text-3xl font-semibold">
                Viswave{' '}
                <strong className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-4 transition hover:text-emerald-300">
                  AR site
                </strong>{' '}
                publisher
              </h1>
            </div>
            <p className="text-gray-600">
              AR 콘텐츠를 업로드하고 QR 코드로 배포하세요
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-lg text-gray-900 font-semibold">
              {stepMessageMap[step]}
            </h2>
            <div className="space-y-6">
              <MindARCompiler onCompileColplete={handleComplieComplete} />

              {targetFile && (
                <FileUpload
                  accept="video/*"
                  label="Video Content"
                  icon="video"
                  onFileSelect={handleVideoSelect}
                  file={videoFile}
                />
              )}

              {canPublish && (
                <div className="pt-4">
                  <Button
                    onClick={handlePublish}
                    disabled={!canPublish && progress !== 0}
                    className="w-full"
                    size="lg"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Publish
                  </Button>

                  {/* {!canPublish && (
                  <p className="text-sm text-gray-500 text-center mt-3">
                    모든 파일을 업로드해주세요
                  </p>
                )} */}
                </div>
              )}
              {progress !== 0 && <Progress value={progress} />}
            </div>
          </div>

          {/* Info Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              이미지 타겟과 비디오를 업로드하면 AR 경험을 위한 QR 코드가
              생성됩니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
