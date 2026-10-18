import type { DocumentRecord } from '../types/document'
import { API_FILES_URL, API_HEALTH_URL } from '../lib/config'
import { getErrorMessage } from '../lib/file-utils'

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const response = await fetch(API_FILES_URL)
  const body = await readJson(response)
  if (!response.ok) throw new Error(getErrorMessage(body, 'Could not load the document list.'))
  if (!Array.isArray(body)) throw new Error('The API returned an unexpected document list.')
  return body as DocumentRecord[]
}

export async function checkApiHealth(): Promise<void> {
  const response = await fetch(API_HEALTH_URL)
  if (!response.ok) throw new Error('Health check failed.')
}

export function uploadDocument(
  file: File,
  onProgress: (percentage: number) => void,
): Promise<DocumentRecord> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)
    request.open('POST', API_FILES_URL)
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    })
    request.addEventListener('load', () => {
      let body: unknown
      try {
        body = JSON.parse(request.responseText)
      } catch {
        reject(new Error('The server returned an invalid response.'))
        return
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(getErrorMessage(body, 'Upload failed.')))
        return
      }
      resolve(body as DocumentRecord)
    })
    request.addEventListener('error', () => reject(new Error('Network error while uploading the file.')))
    request.addEventListener('abort', () => reject(new Error('The upload was cancelled.')))
    request.send(formData)
  })
}

export async function deleteDocument(fileId: string): Promise<void> {
  const response = await fetch(`${API_FILES_URL}/${encodeURIComponent(fileId)}`, { method: 'DELETE' })
  if (response.ok) return
  const body = await readJson(response)
  throw new Error(getErrorMessage(body, 'Delete failed.'))
}
