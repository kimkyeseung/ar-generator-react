export type ProjectMode = 'ar' | 'basic'
export type CameraResolution = 'fhd' | 'hd'
export type VideoQuality = 'high' | 'medium' | 'low' // 고화질(압축x), 중간화질, 저화질

export interface VideoPosition {
  x: number // 0~1 범위 (화면 비율 기준)
  y: number // 0~1 범위 (화면 비율 기준)
}

// 크로마키 강도 설정
export interface ChromaKeySettings {
  similarity: number // 0.0~1.0, 기본값 0.4 - 색상 범위 (높을수록 더 넓은 범위 제거)
  smoothness: number // 0.0~0.5, 기본값 0.08 - 경계 부드러움 (높을수록 부드러운 경계)
}

export const DEFAULT_CHROMAKEY_SETTINGS: ChromaKeySettings = {
  similarity: 0.4,
  smoothness: 0.08,
}

// 오버레이 이미지 (클릭 시 링크 열림)
export interface OverlayImage {
  fileId: string | null
  linkUrl: string | null
}

export interface Project {
  id: string
  folderId: string
  videoFileId: string
  previewVideoFileId: string | null // 압축된 프리뷰 영상 (저화질/중화질 모드에서 사용)
  targetFileId: string | null // 기본모드에서는 null
  targetImageFileId: string | null
  thumbnailFileId: string | null // 정사각형 썸네일 (미설정시 영상 첫화면 사용)
  overlayImageFileId: string | null // 오버레이 이미지 (클릭 시 링크 열림)
  overlayLinkUrl: string | null // 오버레이 이미지 클릭 시 열릴 URL
  width: number | null
  height: number | null
  title: string | null
  description: string | null
  chromaKeyColor: string | null
  chromaKeySimilarity: number | null // 크로마키 색상 범위 (0.0~1.0)
  chromaKeySmoothness: number | null // 크로마키 경계 부드러움 (0.0~0.5)
  flatView: boolean
  highPrecision: boolean
  mode: ProjectMode // 'ar' | 'basic'
  cameraResolution: CameraResolution // '4k' | 'fhd' | 'hd'
  videoQuality: VideoQuality // 'high' | 'medium' | 'low' - 영상 품질
  videoPosition: VideoPosition | null // 기본모드에서 비디오 위치
  videoScale: number | null // 기본모드에서 비디오 크기 (0.2~5.0)
  createdAt: string
  updatedAt: string
}
