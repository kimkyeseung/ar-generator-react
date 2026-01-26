export type ProjectMode = 'ar' | 'basic'

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
  width: number | null
  height: number | null
  title: string | null
  description: string | null
  chromaKeyColor: string | null
  flatView: boolean
  highPrecision: boolean
  mode: ProjectMode // 'ar' | 'basic'
  videoPosition: VideoPosition | null // 기본모드에서 비디오 위치
  videoScale: number | null // 기본모드에서 비디오 크기 (0.1~2.0)
  createdAt: string
  updatedAt: string
}
