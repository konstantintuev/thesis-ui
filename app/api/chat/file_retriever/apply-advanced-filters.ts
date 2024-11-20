import { SupabaseClient } from "@supabase/supabase-js"
import { Database, Tables } from "@/supabase/types"
import { groupChunks, retrieveFiles } from "@/lib/retrieval/retrieve-files"
import { addAttachableContent } from "@/lib/retrieval/attachable-content"
import { ExtendedFileForSearch, FilterInfo } from "@/types/retriever"

export const applyAdvancedFilters = async (
  embeddingsProvider: "openai" | "local" | "colbert",
  supabaseInstance: SupabaseClient<Database>,
  profile: Tables<"profiles">,
  uniqueFileIds: string[]
): Promise<{
  [fileId: string]: ExtendedFileForSearch
}> => {
  /* TODO IDEA:
   1. Retrieve advanced filters
   2. Apply each to 2 chunks for each file using json mode
   3. Apply weight of each rule to get score
   4. Give back a JSON with the results
*/
  const { data: advancedRules, error } = await supabaseInstance
    .from("rules")
    .select(
      `
        *
      `
    )
    .eq("type", "advanced")
  if (advancedRules && advancedRules.length > 0) {
    let filesFound: {
      [fileId: string]: ExtendedFileForSearch
    } = {}

    await Promise.allSettled(
      advancedRules.map(async advRule => {
        let localFileItems = await retrieveFiles(
          embeddingsProvider,
          advRule.comparison as string,
          supabaseInstance,
          profile,
          uniqueFileIds.length * 6,
          uniqueFileIds,
          true
        )

        let mostSimilarChunks = await addAttachableContent(
          supabaseInstance,
          localFileItems
        )

        const filesRaw = await groupChunks(supabaseInstance, mostSimilarChunks)

        for (let file of filesRaw) {
          let relevantFile =
            filesFound[file.id] ?? (file as ExtendedFileForSearch)

          // Reverse sort file chunks
          const fileChunks = mostSimilarChunks
            .filter(chunk => chunk.file_id === file.id)
            .sort((a, b) => b.score - a.score)

          // Add the first 4 chunks of a file to filesRaw
          relevantFile.chunks = fileChunks.slice(0, 4) ?? []

          const response = await fetch(
            `${process.env["ML_SERVER_URL"]}/query_processor/ask_file`,
            {
              method: "POST",
              body: JSON.stringify({
                query: advRule.comparison as string,
                file_sections: relevantFile.chunks.map(chunk => chunk.content)
              })
            }
          )
          let res = (await response.json()) as FilterInfo
          if (!relevantFile.advanced_rule_info) {
            relevantFile.advanced_rule_info = {}
          }
          if (!relevantFile.advanced_rules_relevance_score) {
            relevantFile.advanced_rules_relevance_score = 0
          }
          relevantFile.advanced_rule_info[advRule.name] = res
          relevantFile.advanced_rules_relevance_score += advRule.weight

          filesFound[file.id] = relevantFile
        }
      })
    )
    for (let fileKey of Object.keys(filesFound)) {
      let file = filesFound[fileKey]
      let appliedAdvRules =
        file.advanced_rule_info && Object.keys(file.advanced_rule_info)

      file.advanced_rules_relevance_score =
        appliedAdvRules &&
        appliedAdvRules.length > 0 &&
        file.advanced_rules_relevance_score
          ? file.advanced_rules_relevance_score / appliedAdvRules.length
          : 0 // format: 0.343523
    }

    return filesFound
  }
  return {}
}

export const selfRag = () => {
  /* TODO IDEA:
  1. Ask if the given chunks are relevant to the specific query
  2. DONE
*/
}
