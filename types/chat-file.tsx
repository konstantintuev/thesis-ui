export interface ChatFile {
  id: string
  name: string
  type: string
  file: File | null
  relevant?: boolean | null
  fileDate?: string
  authorName?: string
}
