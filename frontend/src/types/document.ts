export type DocumentRecord = {
  file_id: string
  filename: string
  content_type: string
  size_bytes: number
  uploaded_at: string
  download_url: string
}

export type DocumentFilter = 'all' | 'images' | 'pdf' | 'text' | 'other'
export type DocumentView = 'list' | 'grid'
export type ApiStatus = 'unknown' | 'online' | 'offline'
export type Page =
  | 'documents'
  | 'dashboard'
  | 'activity'
  | 'shared'
  | 'recent'
  | 'settings'
  | 'development'
  | 'notifications'
  | 'profile'

export type ActivityRecord = { id: number; message: string; at: string }
