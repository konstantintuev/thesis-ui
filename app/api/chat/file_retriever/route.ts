import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"
import { generateBgeLocalEmbedding } from "@/lib/generate-local-embedding"
import { ChatCompletionMessageParam } from "@/node_modules/openai/src/resources"

export const runtime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: Array<ChatCompletionMessageParam>
  }

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()
    if (messages.length == 0) {
      return new Response(JSON.stringify({ message: "No msges!" }), {
        status: 500
      })
    }
    const localEmbedding = await generateBgeLocalEmbedding(
      messages[messages.length - 1].content
    )

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

    try {
      const profile = await getServerProfile()

      checkApiKey(profile.groq_api_key, "G")

      // Groq is compatible with the OpenAI SDK
      const groq = new OpenAI({
        apiKey: profile.groq_api_key || "",
        baseURL: "https://api.groq.com/openai/v1"
      })

      const response = await groq.chat.completions.create({
        model: chatSettings.model,
        messages,
        max_tokens:
          CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
        stream: true
      })

      // Convert the response into a friendly text-stream.
      const stream = OpenAIStream(response)

      // Respond with the stream
      return new StreamingTextResponse(stream)
    } catch (error: any) {
      let errorMessage = error.message || "An unexpected error occurred"
      const errorCode = error.status || 500

      if (errorMessage.toLowerCase().includes("api key not found")) {
        errorMessage =
          "Groq API Key not found. Please set it in your profile settings."
      } else if (errorCode === 401) {
        errorMessage =
          "Groq API Key is incorrect. Please fix it in your profile settings."
      }

      return new Response(JSON.stringify({ message: errorMessage }), {
        status: errorCode
      })
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
