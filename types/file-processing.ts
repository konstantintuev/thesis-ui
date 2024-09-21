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
  creation_date: number
  mod_date: number
  trapped: string
  encryption: string
  file_name: string
  added_date: number
  num_pages: number
  page_dimensions: {
    width: number
    height: number
    measure: string
  }
  file_size: number
  avg_words_per_page: number
  word_count: number
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
