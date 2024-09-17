import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import { getChatCollectionConsumer } from "@/db/collections"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { addAttachableContent } from "@/lib/retrieval/attachable-content"
import { FileItemSearchResult } from "@/types/ml-server-communication"
import { retrieveFiles } from "@/lib/retrieval/retrieve-files"
import {rerankFilesMLServer} from "@/lib/retrieval/processing/multiple";

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

    localFileItems = await retrieveFiles(
      embeddingsProvider,
      userInput,
      supabaseAdmin,
      profile,
      sourceCount,
      uniqueFileIds
    )

    // Add the attachable content back to each chunk
    /* Strat:
     * 1. Find attachable content by chunk
     * 2. Find uuids in chunk and replace with corresponding item in attachable content
     * 3. Done
     */

    let mostSimilarChunks = await addAttachableContent(
      supabaseAdmin,
      localFileItems
    )

    mostSimilarChunks = await rerankFilesMLServer(userInput, mostSimilarChunks)

    let maxLength = 12_000

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
