import { Json, Tables } from "@/supabase/types"
import { FileItemSearchResult } from "@/types/ml-server-communication"
import { ExtractedItemHtml } from "@/types/file-processing"

export type FilterInfo = {
  score: boolean
  explanation?: string
}

export type RuleComparisonResults = {
  [comparisonName: string]: FilterInfo
}

export type QueryRelatedMetadata = {
  file_query: string
  metadata: {
    average_chunk_relevance: number
    score: number
    chunk_ids: string[]
    summary: string
  }
  sequence_number: number
}

export type ExtendedFileForSearch = Tables<"files"> & {
  chunks: FileItemSearchResult[]
  avg_chunk_relevance_score: number

  basic_rule_relevance_score?: number
  basic_rule_info?: RuleComparisonResults

  advanced_rules_relevance_score?: number
  advanced_rule_info?: RuleComparisonResults

  score: number
  already_queried?: boolean
  query_related_metadata?: QueryRelatedMetadata[]
}

export type AttachableContent = {
  [key: string]: ExtractedItemHtml
}
