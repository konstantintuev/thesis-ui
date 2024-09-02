export interface Tree {
  [key: number]: {
    id: string
    embedding: number[]
    text: string
    children: string[]
    layer: number
  }
}

export interface Metadata {
  format: string
  title: string
  author: string
  subject: string
  keywords: string
  creator: string
  producer: string
  creationDate: number
  modDate: number
  trapped: string
  encryption: string
  fileName: string
  addedDate: number
  numPages: number
  pageDimensions: {
    width: number
    height: number
    measure: string
  }
  fileSize: number
  avgWordsPerPage: number
  wordCount: number
}

export interface ExtractedItemHtml {
  type: string
  length: number
}

export interface ListItem extends ExtractedItemHtml {
  children: string[]
}

export interface ContentItem extends ExtractedItemHtml {
  content: string
}

export type UUIDExtractedItemDict = { [key: string]: ExtractedItemHtml }

export interface FileProcessor {
  processorId: string
  processorName: string
  provider: string
  fileTypesSupported: string[]
}