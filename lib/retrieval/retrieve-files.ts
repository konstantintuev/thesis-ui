import { SupabaseClient } from "@supabase/supabase-js"
import { Database, Tables } from "@/supabase/types"
import { FileItemSearchResult } from "@/types/ml-server-communication"
import { generateBgeLocalEmbedding } from "@/lib/generate-local-embedding"
import { searchFilesMLServer } from "@/lib/retrieval/processing/multiple"
import OpenAI from "openai"

export async function retrieveFiles(
  embeddingsProvider: "openai" | "local" | "colbert",
  userInput: string,
  supabaseInstance: SupabaseClient<Database>,
  profile: Tables<"profiles">,
  sourceCount?: number,
  uniqueFileIds?: string[],
  noReranking?: boolean
) {
  let localFileItems: FileItemSearchResult[] = []

  if (embeddingsProvider === "local") {
    const localEmbedding = await generateBgeLocalEmbedding(userInput)

    if (uniqueFileIds) {
      const { data: embeddingsFileItems, error: embeddingsFileItemsError } =
        await supabaseInstance.rpc("match_file_items_bge", {
          query_embedding: localEmbedding as any,
          match_count: sourceCount,
          file_ids: uniqueFileIds.length > 0 ? uniqueFileIds : undefined
        })
      if (!embeddingsFileItems) {
        return []
      }
      localFileItems = embeddingsFileItems.map(it => {
        let ret = it as any as FileItemSearchResult
        ret.score = it.similarity
        return ret
      })
    } else {
      const { data: embeddingsFileItems, error: localFileItemsError } =
        await supabaseInstance.rpc("match_file_items_any_bge", {
          query_embedding: localEmbedding as any,
          // TODO: maybe make dynamic?
          //min_layer_number: 1
          match_count: sourceCount
        })
      if (!embeddingsFileItems) {
        return []
      }
      localFileItems = embeddingsFileItems.map(it => {
        let ret = it as any as FileItemSearchResult
        ret.score = it.similarity
        return ret
      })
    }
    // disable openAI
  } else if (embeddingsProvider === "colbert" || true) {
    localFileItems = await searchFilesMLServer(
      supabaseInstance,
      userInput,
      uniqueFileIds,
      sourceCount,
      noReranking
    )
  } else if (embeddingsProvider === "openai") {
    let openai
    if (profile.use_azure_openai) {
      openai = new OpenAI({
        apiKey: profile.azure_openai_api_key || "",
        baseURL: `${profile.azure_openai_endpoint}/openai/deployments/${profile.azure_openai_embeddings_id}`,
        defaultQuery: { "api-version": "2023-12-01-preview" },
        defaultHeaders: { "api-key": profile.azure_openai_api_key }
      })
    } else {
      // TODO: untested and unneeded really, doesn't return the whole file table
      openai = new OpenAI({
        apiKey: profile.openai_api_key || "",
        organization: profile.openai_organization_id
      })
    }
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userInput
    })

    const openaiEmbedding = response.data.map(
      (item: { embedding: any }) => item.embedding
    )[0]

    const { data: openaiFileItems, error: openaiError } =
      await supabaseInstance.rpc("match_file_items_openai", {
        query_embedding: openaiEmbedding as any,
        match_count: sourceCount,
        file_ids: uniqueFileIds
      })

    if (openaiError) {
      return []
    }

    localFileItems =
      openaiFileItems?.map(it => {
        let ret = it as any as FileItemSearchResult
        ret.score = it.similarity
        return ret
      }) ?? []
  }
  return localFileItems
}

// Map chunks to filesRaw
export async function groupChunks(
  supabaseAdmin: SupabaseClient<Database>,
  mostSimilarChunks: FileItemSearchResult[]
) {
  const { data: filesRaw, error: filesError } = await supabaseAdmin
    .from("files")
    .select("*")
    .in(
      "id",
      // Remove duplicates
      Array.from(new Set(mostSimilarChunks)).map(chunk => chunk.file_id)
    )
  return filesRaw ?? []
}
