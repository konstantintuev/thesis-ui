import {
  generateBgeLocalEmbedding,
  generateLocalEmbedding
} from "@/lib/generate-local-embedding"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

export async function POST(request: Request) {
  const json = await request.json()
  const { userInput, fileIds, embeddingsProvider, sourceCount } = json as {
    userInput: string
    fileIds: string[]
    embeddingsProvider: "openai" | "local" | "colbert"
    sourceCount: number
  }

  const uniqueFileIds = [...new Set(fileIds)]

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()
    const localEmbedding = await generateBgeLocalEmbedding(userInput)

    const { data: localFileItems, error: localFileItemsError } =
      await supabaseAdmin.rpc("match_file_items_any_bge", {
        query_embedding: localEmbedding as any
      })

    if (localFileItemsError) {
      throw localFileItemsError
    }

    const mostSimilarChunks = localFileItems?.sort(
      (a, b) => b.similarity - a.similarity
    )

    let filesFound: (Database["public"]["Tables"]["files"]["Row"] & {
      chunks?:
        | Database["public"]["Functions"]["match_file_items_any_bge"]["Returns"]
        | undefined
    })[] = []
    // map chunks to files
    const { data: files, error: filesError } = await supabaseAdmin
      .from("files")
      .select("*")
      .in(
        "id",
        mostSimilarChunks?.map(chunk => chunk.file_id)
      )

    filesFound = files ?? []
    // add the first 10 chunks of a file to files
    filesFound =
      filesFound?.map(file => {
        const fileChunks = mostSimilarChunks?.filter(
          chunk => chunk.file_id === file.id
        )
        file.chunks = fileChunks?.slice(0, 10)
        return file
      }) ?? []

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
