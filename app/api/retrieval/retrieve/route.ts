import {
  generateBgeLocalEmbedding,
  generateLocalEmbedding
} from "@/lib/generate-local-embedding"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { getChatCollectionConsumer } from "@/db/collections"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import {
  addUuidObjectToString,
  uuidPattern
} from "@/lib/retrieval/attachable-content"
import { FileItemSearchResult } from "@/types/ml-server-communication"
import { searchFilesMLServer } from "@/lib/retrieval/processing/multiple"

export async function POST(request: Request) {
  const json = await request.json()
  let { userInput, fileIds, embeddingsProvider, sourceCount, chatId } =
    json as {
      userInput: string
      fileIds: string[]
      embeddingsProvider: "openai" | "local" | "colbert"
      sourceCount: number
      chatId: string
    }

  let uniqueFileIds = [...new Set(fileIds)]

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    let chatCollectionConsumer = await getChatCollectionConsumer(
      chatId,
      supabaseAdmin
    )

    if (chatCollectionConsumer) {
      let collectionFiles = await getCollectionFilesByCollectionId(
        chatCollectionConsumer.collection_id,
        supabaseAdmin
      )
      fileIds = collectionFiles.files.map(file => file.id)
      uniqueFileIds = [...new Set(fileIds)]
    }

    let localFileItems: FileItemSearchResult[] = []

    if (embeddingsProvider === "local") {
      const localEmbedding = await generateBgeLocalEmbedding(userInput)

      const { data: embeddingsFileItems, error: embeddingsFileItemsError } =
        await supabaseAdmin.rpc("match_file_items_bge", {
          query_embedding: localEmbedding as any,
          match_count: sourceCount,
          file_ids: uniqueFileIds.length > 0 ? uniqueFileIds : undefined
        })

      if (!embeddingsFileItems) {
        throw embeddingsFileItemsError
      }
      localFileItems = embeddingsFileItems.map(it => {
        let ret = it as any as FileItemSearchResult
        ret.score = it.similarity
        return ret
      })
    } else if (embeddingsProvider === "colbert") {
      localFileItems = await searchFilesMLServer(
        supabaseAdmin,
        userInput,
        uniqueFileIds,
        sourceCount
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

      const openaiEmbedding = response.data.map(item => item.embedding)[0]

      const { data: openaiFileItems, error: openaiError } =
        await supabaseAdmin.rpc("match_file_items_openai", {
          query_embedding: openaiEmbedding as any,
          match_count: sourceCount,
          file_ids: uniqueFileIds
        })

      if (openaiError) {
        throw openaiError
      }

      localFileItems = openaiFileItems.map(it => {
        let ret = it as any as FileItemSearchResult
        ret.score = it.similarity
        return ret
      })
    }

    // Add the attachable content back to each chunk
    /* Strat:
     * 1. Find attachable content by chunk
     * 2. Find uuids in chunk and replace with corresponding item in attachable content
     * 3. Done
     */

    let mostSimilarChunks = localFileItems?.sort((a, b) => b.score - a.score)
    mostSimilarChunks = await Promise.all(
      mostSimilarChunks?.map(async chunk => {
        if (chunk.chunk_attachable_content) {
          let { data } = await supabaseAdmin
            .from("file_items_attachable_content")
            .select("*")
            .eq("id", chunk.chunk_attachable_content)
            .single()

          if (data?.content) {
            chunk.content = chunk.content.replace(uuidPattern, match =>
              addUuidObjectToString(match, data.content as any)
            )
          }
        }
        return chunk
      })
    )

    let maxLength = 6000

    let cumulativeLength = 0
    let lastIndex = 0

    for (let i = 0; i < mostSimilarChunks.length; i++) {
      cumulativeLength += mostSimilarChunks[i].content.length

      if (cumulativeLength > maxLength) {
        lastIndex = i
        break
      }
    }

    if (cumulativeLength > maxLength) {
      mostSimilarChunks.splice(lastIndex)
    }

    return new Response(JSON.stringify({ results: mostSimilarChunks }), {
      status: 200
    })
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
