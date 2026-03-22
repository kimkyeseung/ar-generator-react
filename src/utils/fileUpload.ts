import { API_URL } from '../config/api'

interface UploadResult {
  fileId: string
  folderId: string
}

export interface UploadProgress {
  currentFile: string
  fileIndex: number
  totalFiles: number
  fileProgress: number // 0-100 for current file
  overallProgress: number // 0-100 across all files
}

/**
 * Create a new project folder in Google Drive
 */
export async function createFolder(password: string): Promise<string> {
  const res = await fetch(`${API_URL}/files/create-folder`, {
    method: 'POST',
    headers: {
      'X-Admin-Password': password,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Failed to create folder: ${res.status}`)
  const data = await res.json()
  return data.folderId
}

/**
 * Upload a single file to Google Drive via the server
 * Uses XHR for progress tracking
 */
export function uploadSingleFile(
  file: File | Blob,
  password: string,
  folderId: string,
  category: string,
  options?: {
    index?: number
    fileName?: string
    onProgress?: (percent: number) => void
  },
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file, options?.fileName || (file instanceof File ? file.name : 'blob'))
    formData.append('folderId', folderId)
    formData.append('category', category)
    if (options?.index !== undefined) {
      formData.append('index', String(options.index))
    }

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/files/upload`)
    xhr.setRequestHeader('X-Admin-Password', password)
    xhr.responseType = 'json'

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        options?.onProgress?.(Math.round((evt.loaded / evt.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response)
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(formData)
  })
}

/**
 * Submit project with pre-uploaded file IDs (JSON, no files)
 */
export async function createProjectWithIds(
  password: string,
  data: {
    folderId: string
    targetFileId?: string
    targetImageFileId?: string
    overlayImageFileId?: string
    guideImageFileId?: string
    title?: string
    cameraResolution?: string
    videoQuality?: string
    highPrecision?: boolean
    thumbnailBase64?: string
    filterMinCF?: number
    filterBeta?: number
    missTolerance?: number
    matrixLerpFactor?: number
    mediaItems?: Array<{
      type: string
      mode: string
      fileId: string
      previewFileId?: string
      positionX?: number
      positionY?: number
      scale?: number
      aspectRatio?: number
      chromaKeyEnabled?: boolean
      chromaKeyColor?: string
      chromaKeySimilarity?: number
      chromaKeySmoothness?: number
      flatView?: boolean
      linkEnabled?: boolean
      linkUrl?: string
      order: number
    }>
  },
): Promise<{ folderId: string }> {
  const res = await fetch(`${API_URL}/upload-with-ids`, {
    method: 'POST',
    headers: {
      'X-Admin-Password': password,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('401: 비밀번호가 올바르지 않습니다.')
    throw new Error(`Upload failed: ${res.status}`)
  }
  return res.json()
}

/**
 * Update project with pre-uploaded file IDs (JSON, no files)
 */
export async function updateProjectWithIds(
  password: string,
  projectId: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`${API_URL}/projects/${projectId}/update-with-ids`, {
    method: 'POST',
    headers: {
      'X-Admin-Password': password,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('401: 비밀번호가 올바르지 않습니다.')
    throw new Error(`Update failed: ${res.status}`)
  }
  return res.json()
}

/**
 * Delete a folder (cleanup on failure)
 */
export async function deleteFolder(password: string, folderId: string): Promise<void> {
  await fetch(`${API_URL}/files/folder/${folderId}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Password': password },
  })
}
