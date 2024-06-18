import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"
import { Database, Tables } from "@/supabase/types"
import { generateBgeLocalEmbedding } from "@/lib/generate-local-embedding"
import { NextResponse } from "next/server"

export const runtime = "edge"

async function* getStreamingResponses(
  openai: OpenAI,
  chatSettings: ChatSettings,
  messagesArray: Array<
    Array<{
      content: string
      role: string
    }>
  >
) {
  for (const messages of messagesArray) {
    const response = await openai.chat.completions.create({
      model: "llama3-70b-8192",
      messages: messages as any,
      max_tokens:
        CHAT_SETTING_LIMITS["llama3-70b-8192"].MAX_TOKEN_OUTPUT_LENGTH,
      stream: true
    })

    // Convert the response into a friendly text-stream.
    const stream = OpenAIStream(response)
    yield stream
  }
}

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: Array<{
      content: string
      role: string
    }>
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
    const fileQuery = messages[messages.length - 1].content
    /* What is the plan:
     * Rewrite the latest user message based on the theme of the corpus + previous user messages.
     * Use the last user message to retrieve filesRaw
     * */
    const localEmbedding = await generateBgeLocalEmbedding(fileQuery)

    const { data: localFileItems, error: localFileItemsError } =
      await supabaseAdmin.rpc("match_file_items_any_bge", {
        query_embedding: localEmbedding as any,
        min_layer_number: 1
      })

    if (localFileItemsError) {
      throw localFileItemsError
    }

    const mostSimilarChunks = localFileItems?.sort(
      (a, b) => b.similarity - a.similarity
    )

    type ExtendedFile = Tables<"files"> & {
      chunks: Database["public"]["Functions"]["match_file_items_any_bge"]["Returns"]
    }
    let filesFound: ExtendedFile[]
    // map chunks to filesRaw
    const { data: filesRaw, error: filesError } = await supabaseAdmin
      .from("files")
      .select("*")
      .in(
        "id",
        mostSimilarChunks?.map(chunk => chunk.file_id)
      )

    // add the first 10 chunks of a file to filesRaw
    // @ts-ignore
    filesFound =
      filesRaw?.map((file: ExtendedFile) => {
        // reverse sort
        const fileChunks = mostSimilarChunks
          ?.filter(chunk => chunk.file_id === file.id)
          .sort((a, b) => b.similarity - a.similarity)
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

      // for each file run summary and return streaming text response
      //  -> when the stream ends, replace with new stream of next file
      const messagesArray = filesFound.map(file => [
        {
          role: "system",
          content:
            "Today is 18/06/2024.\n\nUser Instructions:\nYou are a friendly, helpful AI assistant."
        },
        {
          role: "user",
          content:
            "I have the following question: " +
            fileQuery +
            "\n\n" +
            "With bulletpoints please tell me what information does the following file contain about my question:" +
            "\n" +
            file.chunks.map(item => `${item.content}`).join("\n\n")
        }
      ])

      const encoder = new TextEncoder()
      let decoder = new TextDecoder("utf-8")
      const readableStream = new ReadableStream({
        async start(controller) {
          const generator = getStreamingResponses(
            groq,
            chatSettings,
            messagesArray
          )

          try {
            for await (const stream of generator) {
              // @ts-ignore
              for await (const chunk of stream) {
                controller.enqueue(encoder.encode(decoder.decode(chunk)))
              }
              // Add custom chunk after each stream ends
              const customChunk = "Custom message after each response.\n"
              controller.enqueue(encoder.encode(customChunk))
            }
          } catch (err) {
            controller.error(err)
          } finally {
            controller.close()
          }
        }
      })
      return new NextResponse(readableStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
          //'Transfer-Encoding': 'chunked'
        }
      })
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
