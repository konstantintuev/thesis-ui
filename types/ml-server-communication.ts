import { Metadata, Tree, UUIDExtractedItemDict } from "@/types/file-processing"
import { Tables } from "@/supabase/types"

export type MultipleFilesQueueResult = [
  {
    file_uuid: string
    status: string
    result: {
      uuid_items: UUIDExtractedItemDict
      tree: Tree
      metadata: Metadata
    }
  }
]

/* Sample SearchResults JSON:
{
    "score": 22.4420108795166,
    "rank": 1,
    "passage_id": "4e33e0a3-7622-4840-b195-75fa9339373f",
    "document_metadata": {
        "doc_id": "c8978a17-7d35-4d5a-977e-c295ab5e16b1",
        "chunk_id": "4e33e0a3-7622-4840-b195-75fa9339373f",
        "children": [],
        "layer": 0
    }
}
*/

export type SearchResult = {
  content?: string
  score: number
  rank: number
  passage_id: string
  document_metadata?: {
    doc_id: string
    chunk_id: string
    children: string[]
    layer: number
  }
}

export type SearchResults = SearchResult[]

export type FileItemSearchResult = Tables<"file_items"> & {
  score: number
  rank?: number
}
