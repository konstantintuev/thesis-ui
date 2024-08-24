import { Json, Tables } from "@/supabase/types"
import { FileItemSearchResult } from "@/types/ml-server-communication"
import { ExtractedItemHtml } from "@/types/file-processing"

export type BasicRuleComparisonResults = {
  [comparisonName: string]: boolean
}

export type QueryRelatedMetadata = {
  file_query: string
  metadata: {
    average_chunk_relevance: number
    score: number
    chunk_ids: string[]
    summary: string
  }
}

export type ExtendedFileForSearch = Tables<"files"> & {
  chunks: FileItemSearchResult[]
  avg_chunk_relevance_score: number
  basic_rule_relevance_score?: number
  basic_rule_info?: BasicRuleComparisonResults
  score: number
  already_queried?: boolean
  query_related_metadata?: Json[]
}

export type AttachableContent = {
  [key: string]: ExtractedItemHtml
}
