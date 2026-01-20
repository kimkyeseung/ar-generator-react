export interface Project {
  id: string
  folderId: string
  videoFileId: string
  targetFileId: string
  targetImageFileId: string | null
  width: number | null
  height: number | null
  title: string | null
  description: string | null
  chromaKeyColor: string | null
  flatView: boolean
  highPrecision: boolean
  createdAt: string
  updatedAt: string
}
