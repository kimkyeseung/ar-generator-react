export type ProjectMode = 'ar' | 'basic'
export type CameraResolution = 'fhd' | 'hd' | 'nhd' | 'vga' | 'qvga'
export type VideoQuality = 'high' | 'medium' | 'low' // 고화질(압축x), 중간화질, 저화질

export interface VideoPosition {
  x: number // 0~1 범위 (화면 비율 기준)
  y: number // 0~1 범위 (화면 비율 기준)
}

export interface Project {
  id: string
  folderId: string
  videoFileId: string
  targetFileId: string | null // 기본모드에서는 null
  targetImageFileId: string | null
  thumbnailFileId: string | null // 정사각형 썸네일 (미설정시 영상 첫화면 사용)
  width: number | null
  height: number | null
  title: string | null
  description: string | null
  chromaKeyColor: string | null
  flatView: boolean
  highPrecision: boolean
  mode: ProjectMode // 'ar' | 'basic'
  cameraResolution: CameraResolution // '4k' | 'fhd' | 'hd'
  videoPosition: VideoPosition | null // 기본모드에서 비디오 위치
  videoScale: number | null // 기본모드에서 비디오 크기 (0.2~5.0)
  createdAt: string
  updatedAt: string
}
