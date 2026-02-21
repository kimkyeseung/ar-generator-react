// ProjectMode는 더 이상 사용하지 않음 - 미디어 아이템의 mode로 대체
// 기존 데이터 호환성을 위해 타입만 유지
export type ProjectMode = 'ar' | 'basic'
export type CameraResolution = 'fhd' | 'hd'
export type VideoQuality = 'high' | 'medium' | 'low' // 고화질(압축x), 중간화질, 저화질

// 멀티 미디어 시스템 타입
export type MediaType = 'video' | 'image'
export type MediaMode = 'tracking' | 'basic'

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

// 개별 미디어 아이템 (영상 또는 이미지)
export interface MediaItem {
  id: string
  type: MediaType // 'video' | 'image'
  mode: MediaMode // 'tracking' | 'basic'
  file: File | null // 새로 업로드할 파일
  previewFile: File | null // 압축된 프리뷰 파일 (영상용)
  existingFileId: string | null // 기존 파일 ID (편집 모드)
  existingPreviewFileId: string | null // 기존 프리뷰 파일 ID
  aspectRatio: number // 가로/세로 비율
  position: VideoPosition // 위치 (0~1 범위)
  scale: number // 크기 (0.2~5.0)
  chromaKeyEnabled: boolean // 크로마키 활성화 여부
  chromaKeyColor: string // 크로마키 색상 (HEX)
  chromaKeySettings: ChromaKeySettings // 크로마키 세부 설정
  flatView: boolean // 빌보드 효과 (트래킹 모드)
  linkUrl?: string // 링크 URL (이미지용)
  linkEnabled?: boolean // 링크 활성화 여부 (이미지용)
  order: number // 레이어 순서
  isCollapsed: boolean // 접힘 상태
}

// MediaItem 생성 헬퍼
export const createDefaultMediaItem = (
  id: string,
  type: MediaType,
  order: number
): MediaItem => ({
  id,
  type,
  mode: 'tracking', // 기본값: 트래킹 모드 (AR)
  file: null,
  previewFile: null,
  existingFileId: null,
  existingPreviewFileId: null,
  aspectRatio: 16 / 9,
  position: { x: 0.5, y: 0.5 },
  scale: 1,
  chromaKeyEnabled: false,
  chromaKeyColor: '#00FF00',
  chromaKeySettings: { ...DEFAULT_CHROMAKEY_SETTINGS },
  flatView: false,
  linkUrl: '',
  linkEnabled: false,
  order,
  isCollapsed: false,
})

// 미디어 아이템 서버 응답 타입
export interface MediaItemResponse {
  id: string
  projectId: string
  type: MediaType
  mode: MediaMode
  fileId: string
  previewFileId: string | null
  positionX: number | null
  positionY: number | null
  scale: number | null
  aspectRatio: number | null
  chromaKeyEnabled: boolean
  chromaKeyColor: string | null
  chromaKeySimilarity: number | null
  chromaKeySmoothness: number | null
  flatView: boolean
  linkEnabled: boolean
  linkUrl: string | null
  order: number
  createdAt: string
  updatedAt: string
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
  guideImageFileId: string | null // 안내문구 이미지
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
  // 멀티 미디어 아이템 (새 시스템)
  mediaItems: MediaItemResponse[]
  createdAt: string
  updatedAt: string
}
