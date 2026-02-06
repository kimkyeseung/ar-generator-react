import { FileUpload } from '../FileUpload'
import StatusCallout from './StatusCallout'
import VideoLimitNotice from './VideoLimitNotice'
import { isValidHexColor } from '../../utils/validation'
import { ChromaKeySettings, DEFAULT_CHROMAKEY_SETTINGS } from '../../types/project'

type VideoUploadSectionProps = {
  isTargetReady: boolean
  videoFile: File | null
  onFileSelect: (file: File | File[] | null) => void
  limitMb: number
  videoError: string | null
  useChromaKey: boolean
  onUseChromaKeyChange: (value: boolean) => void
  chromaKeyColor: string
  onChromaKeyColorChange: (value: string) => void
  chromaKeySettings: ChromaKeySettings
  onChromaKeySettingsChange: (settings: ChromaKeySettings) => void
  chromaKeyError: string | null
  flatView: boolean
  onFlatViewChange: (value: boolean) => void
  showFlatView?: boolean // AR 모드에서만 표시
}

export default function VideoUploadSection({
  isTargetReady,
  videoFile,
  onFileSelect,
  limitMb,
  videoError,
  useChromaKey,
  onUseChromaKeyChange,
  chromaKeyColor,
  onChromaKeyColorChange,
  chromaKeySettings,
  onChromaKeySettingsChange,
  chromaKeyError,
  flatView,
  onFlatViewChange,
  showFlatView = true,
}: VideoUploadSectionProps) {
  if (!isTargetReady) {
    return (
      <StatusCallout message='타겟 이미지를 업로드해 .mind 파일을 생성하면 비디오를 연결할 수 있습니다.' />
    )
  }

  const handleColorChange = (value: string) => {
    // # 없으면 추가
    if (value && !value.startsWith('#')) {
      value = '#' + value
    }
    onChromaKeyColorChange(value)
  }

  return (
    <div className='space-y-4'>
      <FileUpload
        accept='video/*'
        label='Video Content'
        icon='video'
        onFileSelect={onFileSelect}
        file={videoFile}
      />
      <VideoLimitNotice limitMb={limitMb} />

      {/* 영상 옵션 설정 */}
      <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4'>
        {/* 정면 고정 옵션 - AR 모드에서만 표시 */}
        {showFlatView && (
          <div className='flex items-start gap-3'>
            <input
              type='checkbox'
              id='flat-view'
              checked={flatView}
              onChange={(e) => onFlatViewChange(e.target.checked)}
              className='h-4 w-4 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500'
            />
            <div>
              <label htmlFor='flat-view' className='text-sm font-medium text-gray-700'>
                항상 정면으로 표시
              </label>
              <p className='text-xs text-gray-500 mt-1'>
                타겟 이미지의 기울기에 상관없이 영상이 항상 카메라를 향해 정면으로 표시됩니다.
              </p>
            </div>
          </div>
        )}

        {/* 크로마키 설정 */}
        <div className='flex items-center gap-3'>
          <input
            type='checkbox'
            id='use-chroma-key'
            checked={useChromaKey}
            onChange={(e) => onUseChromaKeyChange(e.target.checked)}
            className='h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500'
          />
          <label htmlFor='use-chroma-key' className='text-sm font-medium text-gray-700'>
            크로마키 적용
          </label>
        </div>

        {useChromaKey && (
          <div className='mt-4 space-y-4'>
            {/* 크로마키 색상 */}
            <div className='space-y-2'>
              <div className='flex items-center gap-3'>
                <label htmlFor='chroma-color' className='text-sm text-gray-600 whitespace-nowrap'>
                  크로마키 색상
                </label>
                <div className='flex flex-1 items-center gap-2'>
                  <input
                    type='color'
                    id='chroma-color-picker'
                    value={isValidHexColor(chromaKeyColor) ? chromaKeyColor : '#00FF00'}
                    onChange={(e) => onChromaKeyColorChange(e.target.value)}
                    className='h-10 w-12 cursor-pointer rounded border border-gray-300'
                  />
                  <input
                    type='text'
                    id='chroma-color'
                    value={chromaKeyColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    placeholder='#00FF00'
                    className='flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500'
                  />
                </div>
              </div>
              <p className='text-xs text-gray-500'>
                영상에서 제거할 배경 색상을 선택하세요 (예: 그린스크린 #00FF00)
              </p>
              {chromaKeyError && (
                <p className='text-xs text-red-500'>{chromaKeyError}</p>
              )}
            </div>

            {/* 크로마키 강도 조절 */}
            <div className='space-y-3 pt-2 border-t border-gray-200'>
              <p className='text-sm font-medium text-gray-700'>강도 조절</p>

              {/* 색상 범위 (Similarity) */}
              <div className='space-y-1'>
                <div className='flex items-center justify-between'>
                  <label htmlFor='chroma-similarity' className='text-xs text-gray-600'>
                    색상 범위
                  </label>
                  <span className='text-xs text-gray-500 font-mono'>
                    {chromaKeySettings.similarity.toFixed(2)}
                  </span>
                </div>
                <input
                  type='range'
                  id='chroma-similarity'
                  min='0.1'
                  max='0.8'
                  step='0.01'
                  value={chromaKeySettings.similarity}
                  onChange={(e) => onChromaKeySettingsChange({
                    ...chromaKeySettings,
                    similarity: parseFloat(e.target.value)
                  })}
                  className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600'
                />
                <p className='text-xs text-gray-400'>
                  높을수록 더 넓은 색상 범위를 제거합니다
                </p>
              </div>

              {/* 경계 부드러움 (Smoothness) */}
              <div className='space-y-1'>
                <div className='flex items-center justify-between'>
                  <label htmlFor='chroma-smoothness' className='text-xs text-gray-600'>
                    경계 부드러움
                  </label>
                  <span className='text-xs text-gray-500 font-mono'>
                    {chromaKeySettings.smoothness.toFixed(2)}
                  </span>
                </div>
                <input
                  type='range'
                  id='chroma-smoothness'
                  min='0.01'
                  max='0.3'
                  step='0.01'
                  value={chromaKeySettings.smoothness}
                  onChange={(e) => onChromaKeySettingsChange({
                    ...chromaKeySettings,
                    smoothness: parseFloat(e.target.value)
                  })}
                  className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600'
                />
                <p className='text-xs text-gray-400'>
                  높을수록 경계가 부드러워집니다
                </p>
              </div>

              {/* 기본값 복원 버튼 */}
              <button
                type='button'
                onClick={() => onChromaKeySettingsChange(DEFAULT_CHROMAKEY_SETTINGS)}
                className='text-xs text-purple-600 hover:text-purple-700 underline'
              >
                기본값으로 복원
              </button>
            </div>
          </div>
        )}
      </div>

      {videoError && <StatusCallout message={videoError} variant='error' />}
    </div>
  )
}
