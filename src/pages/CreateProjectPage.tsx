import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import HeroHeader from '../components/home/HeroHeader'
import InfoFooter from '../components/home/InfoFooter'
import PageBackground from '../components/home/PageBackground'
import PublishSection from '../components/home/PublishSection'
import PasswordModal from '../components/PasswordModal'
import ProjectForm, { ProjectFormState } from '../components/ProjectForm'
import UnifiedPreviewCanvas from '../components/preview/UnifiedPreviewCanvas'
import TwoColumnLayout from '../components/layout/TwoColumnLayout'
import { Button } from '../components/ui/button'
import { useImageCompiler } from '../hooks/useImageCompiler'
import { DEFAULT_STABILIZATION_SETTINGS } from '../types/project'
import { isValidHexColor } from '../utils/validation'
import { verifyPassword } from '../utils/auth'
import {
  createFolder,
  uploadSingleFile,
  createProjectWithIds,
  deleteFolder,
} from '../utils/fileUpload'

export default function CreateProjectPage() {
  const [progress, setProgress] = useState<number>(0)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Form state
  const [formState, setFormState] = useState<ProjectFormState>({
    title: '',
    cameraResolution: 'fhd',
    videoQuality: 'low',
    thumbnailBase64: null,
    targetImageFiles: [],
    guideImageFile: null,
    mediaItems: [],
    selectedMediaItemId: null,
    highPrecision: false,
    stabilization: { ...DEFAULT_STABILIZATION_SETTINGS },
  })

  // 미리보기 줌
  const [previewZoom, setPreviewZoom] = useState(1)

  // 업로드/에러 상태
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')

  // 비밀번호 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // 훅
  const { compile, isCompiling, progress: compileProgress } = useImageCompiler()

  // Form state 변경 핸들러
  const handleFormChange = useCallback((updates: Partial<ProjectFormState>) => {
    setFormState(prev => ({ ...prev, ...updates }))
  }, [])

  // 미디어 아이템 위치 변경
  const handleMediaItemPositionChange = useCallback((id: string, position: { x: number; y: number }) => {
    setFormState(prev => ({
      ...prev,
      mediaItems: prev.mediaItems.map(item =>
        item.id === id ? { ...item, position } : item
      ),
    }))
  }, [])

  // 멀티 미디어 아이템 스케일 변경
  const handleMediaItemScaleChange = useCallback((id: string, scale: number) => {
    setFormState(prev => ({
      ...prev,
      mediaItems: prev.mediaItems.map(item =>
        item.id === id ? { ...item, scale } : item
      ),
    }))
  }, [])

  // 퍼블리시 가능 여부
  // 트래킹 미디어가 있으면: 타겟 이미지 파일 + 미디어 아이템 필요
  // 트래킹 미디어가 없으면: 미디어 아이템만 필요
  const canPublish = useMemo(() => {
    const { targetImageFiles, mediaItems } = formState
    const hasMediaItems = mediaItems.some(item => item.file !== null)
    const hasTrackingItems = mediaItems.some(item => item.mode === 'tracking')
    // 크로마키 검증: 크로마키 활성화된 아이템의 색상이 모두 유효한지 확인
    const hasValidChromaKey = mediaItems
      .filter(item => item.chromaKeyEnabled)
      .every(item => isValidHexColor(item.chromaKeyColor))

    if (hasTrackingItems) {
      return targetImageFiles.length > 0 && hasMediaItems && hasValidChromaKey
    }
    // 트래킹 미디어가 없으면 타겟 이미지 불필요
    return hasMediaItems && hasValidChromaKey
  }, [formState.targetImageFiles, formState.mediaItems])

  // 배포 버튼 클릭 시 비밀번호 모달 열기
  const handlePublishClick = () => {
    if (!canPublish || isUploading || isCompiling) return

    setPasswordError(null)
    setShowPasswordModal(true)
  }

  // 비밀번호 확인 후 컴파일 + 업로드 순차 실행
  const handlePasswordSubmit = async (password: string) => {
    if (!canPublish) return

    const {
      title,
      cameraResolution,
      videoQuality,
      thumbnailBase64,
      targetImageFiles,
      guideImageFile,
      mediaItems,
      highPrecision,
      stabilization,
    } = formState

    const mediaItemsWithFiles = mediaItems.filter(item => item.file !== null)
    const hasTrackingItems = mediaItems.some(item => item.mode === 'tracking')

    // 트래킹 미디어가 있으면 타겟 이미지 필수
    if (hasTrackingItems && targetImageFiles.length === 0) return
    // 미디어 아이템 필수
    if (mediaItemsWithFiles.length === 0) return

    let folderId: string | null = null

    try {
      setUploadError(null)

      // 1. 비밀번호 먼저 검증
      const isValidPassword = await verifyPassword(password)
      if (!isValidPassword) {
        setPasswordError('비밀번호가 올바르지 않습니다.')
        return
      }

      // 비밀번호 확인 성공 - 모달 닫기
      setShowPasswordModal(false)
      setIsUploading(true)
      setProgress(0)

      // 2. 트래킹 미디어가 있으면 타겟 이미지 컴파일
      let targetBuffer: ArrayBuffer | null = null
      let originalImage: File | null = null
      if (hasTrackingItems) {
        const compiled = await compile(targetImageFiles, { highPrecision })
        targetBuffer = compiled.targetBuffer
        originalImage = compiled.originalImage
      }

      // 3. 폴더 생성
      setUploadStatus('폴더 생성 중...')
      folderId = await createFolder(password)

      // 4. 개별 파일 업로드
      // 업로드할 파일 목록 계산
      let totalFiles = 0
      if (targetBuffer) totalFiles++ // .mind file
      if (originalImage) totalFiles++ // target image
      if (guideImageFile) totalFiles++ // guide image
      mediaItemsWithFiles.forEach(item => {
        totalFiles++ // media file
        if (item.previewFile) totalFiles++ // preview file
      })

      let uploadedCount = 0
      const updateProgress = (fileLabel: string, filePercent: number) => {
        const base = (uploadedCount / totalFiles) * 100
        const filePortion = (filePercent / 100) * (1 / totalFiles) * 100
        setProgress(Math.round(base + filePortion))
        setUploadStatus(`파일 업로드 중 (${uploadedCount + 1}/${totalFiles}) - ${fileLabel}`)
      }

      // Upload .mind file
      let targetFileId: string | undefined
      if (targetBuffer) {
        const blob = new Blob([targetBuffer], { type: 'application/octet-stream' })
        const result = await uploadSingleFile(blob, password, folderId, 'target', {
          fileName: 'targets.mind',
          onProgress: (pct) => updateProgress('타겟 파일', pct),
        })
        targetFileId = result.fileId
        uploadedCount++
      }

      // Upload target image
      let targetImageFileId: string | undefined
      if (originalImage) {
        const result = await uploadSingleFile(originalImage, password, folderId, 'targetImage', {
          onProgress: (pct) => updateProgress('타겟 이미지', pct),
        })
        targetImageFileId = result.fileId
        uploadedCount++
      }

      // Upload guide image
      let guideImageFileId: string | undefined
      if (guideImageFile) {
        const result = await uploadSingleFile(guideImageFile, password, folderId, 'guideImage', {
          onProgress: (pct) => updateProgress('안내문구 이미지', pct),
        })
        guideImageFileId = result.fileId
        uploadedCount++
      }

      // Upload media files
      const mediaItemsPayload: Array<{
        type: string
        mode: string
        fileId: string
        previewFileId?: string
        positionX: number
        positionY: number
        scale: number
        aspectRatio: number
        chromaKeyEnabled: boolean
        chromaKeyColor: string
        chromaKeySimilarity: number
        chromaKeySmoothness: number
        flatView: boolean
        linkEnabled: boolean
        linkUrl: string
        order: number
      }> = []

      for (let i = 0; i < mediaItemsWithFiles.length; i++) {
        const item = mediaItemsWithFiles[i]

        // Upload media file
        const mediaResult = await uploadSingleFile(item.file!, password, folderId, 'media', {
          index: i,
          onProgress: (pct) => updateProgress(`미디어 ${i + 1}`, pct),
        })
        uploadedCount++

        // Upload preview file if exists
        let previewFileId: string | undefined
        if (item.previewFile) {
          const previewResult = await uploadSingleFile(item.previewFile, password, folderId, 'preview', {
            index: i,
            onProgress: (pct) => updateProgress(`프리뷰 ${i + 1}`, pct),
          })
          previewFileId = previewResult.fileId
          uploadedCount++
        }

        mediaItemsPayload.push({
          type: item.type,
          mode: item.mode,
          fileId: mediaResult.fileId,
          previewFileId,
          positionX: item.position.x,
          positionY: item.position.y,
          scale: item.scale,
          aspectRatio: item.aspectRatio,
          chromaKeyEnabled: item.chromaKeyEnabled,
          chromaKeyColor: item.chromaKeyColor,
          chromaKeySimilarity: item.chromaKeySettings.similarity,
          chromaKeySmoothness: item.chromaKeySettings.smoothness,
          flatView: item.flatView,
          linkEnabled: item.linkEnabled ?? false,
          linkUrl: item.linkUrl ?? '',
          order: i,
        })
      }

      // 5. 프로젝트 생성 (JSON)
      setUploadStatus('프로젝트 생성 중...')
      setProgress(100)

      const projectData: Parameters<typeof createProjectWithIds>[1] = {
        folderId,
        targetFileId,
        targetImageFileId,
        guideImageFileId,
        title: title || undefined,
        cameraResolution,
        videoQuality,
        highPrecision: hasTrackingItems ? highPrecision : undefined,
        thumbnailBase64: thumbnailBase64 || undefined,
        mediaItems: mediaItemsPayload,
      }

      // 트래킹 안정화 설정 (트래킹 미디어가 있을 때만)
      if (hasTrackingItems) {
        projectData.filterMinCF = stabilization.filterMinCF
        projectData.filterBeta = stabilization.filterBeta
        projectData.missTolerance = stabilization.missTolerance
        projectData.matrixLerpFactor = stabilization.matrixLerpFactor
      }

      const res = await createProjectWithIds(password, projectData)

      // React Query 캐시 무효화 (새 프로젝트가 즉시 반영되도록)
      await queryClient.invalidateQueries({ queryKey: ['arData', res.folderId] })

      navigate(`/result/qr/${res.folderId}`)
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

      setUploadError(errorMessage)

      // 폴더가 생성되었으면 정리
      if (folderId) {
        try {
          await deleteFolder(password, folderId)
        } catch (cleanupError) {
          console.error('Failed to cleanup folder:', cleanupError)
        }
      }
    } finally {
      setIsUploading(false)
      setUploadStatus('')
    }
  }

  // 현재 단계 메시지
  const stepMessage = useMemo(() => {
    const { targetImageFiles, mediaItems } = formState
    const hasMediaContent = mediaItems.some(item => item.file !== null)
    const hasTrackingItems = mediaItems.some(item => item.mode === 'tracking')

    // 트래킹 미디어가 있으면 타겟 이미지 필요
    if (hasTrackingItems) {
      if (targetImageFiles.length === 0) {
        return 'Step 1. 타겟 이미지를 업로드해주세요.'
      }
      if (!hasMediaContent) {
        return 'Step 2. 영상이나 이미지를 추가해주세요.'
      }
      return 'Step 3. 배포 버튼을 클릭하세요.'
    }
    // 트래킹 미디어가 없으면 타겟 이미지 불필요
    if (!hasMediaContent) {
      return 'Step 1. 영상이나 이미지를 추가해주세요.'
    }
    return 'Step 2. 위치를 조정하고 배포 버튼을 클릭하세요.'
  }, [formState.targetImageFiles, formState.mediaItems])

  // 워크플로우 상태
  const workflowStatus = useMemo(() => {
    if (isCompiling) return `타겟 변환 중 (${Math.round(compileProgress)}%)`
    if (isUploading) return uploadStatus || `업로드 중 (${progress}%)`
    if (canPublish) return '배포 준비 완료'
    return '파일을 업로드해주세요'
  }, [canPublish, isCompiling, isUploading, compileProgress, progress, uploadStatus])

  // Footer (배포 섹션)
  const formFooter = (
    <div className="mt-6">
      <PublishSection
        canPublish={canPublish}
        onPublish={handlePublishClick}
        progress={isCompiling ? compileProgress : progress}
        isUploading={isUploading}
        isCompiling={isCompiling}
        uploadError={uploadError}
      />
    </div>
  )

  // 설정 패널 (좌측)
  const settingsPanel = (
    <ProjectForm
      state={formState}
      onChange={handleFormChange}
      disabled={isUploading || isCompiling}
      stepMessage={stepMessage}
      workflowStatus={workflowStatus}
      footer={formFooter}
    />
  )

  // 미리보기 패널 (우측)
  const previewPanel = (
    <UnifiedPreviewCanvas
      items={formState.mediaItems}
      selectedItemId={formState.selectedMediaItemId}
      onItemSelect={(id) => handleFormChange({ selectedMediaItemId: id })}
      onItemPositionChange={handleMediaItemPositionChange}
      onItemScaleChange={handleMediaItemScaleChange}
      zoom={previewZoom}
      onZoomChange={setPreviewZoom}
    />
  )

  return (
    <PageBackground>
      <div className='container mx-auto px-4 py-12'>
        <div className='mx-auto max-w-6xl space-y-10'>
          <div className='flex items-center justify-between'>
            <Button
              variant='ghost'
              onClick={() => navigate('/')}
              className='text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            >
              ← 목록으로
            </Button>
          </div>

          <HeroHeader />

          <TwoColumnLayout
            leftPanel={settingsPanel}
            rightPanel={previewPanel}
          />

          <InfoFooter />
        </div>
      </div>

      {/* 비밀번호 입력 모달 */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setPasswordError(null)
        }}
        onSubmit={handlePasswordSubmit}
        isLoading={isUploading || isCompiling}
        error={passwordError}
      />
    </PageBackground>
  )
}
