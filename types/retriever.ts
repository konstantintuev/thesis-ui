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
