import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"
import { Database, Json, Tables, TablesInsert } from "@/supabase/types"
import { generateBgeLocalEmbedding } from "@/lib/generate-local-embedding"
import { NextResponse } from "next/server"
import { searchFilesMLServer } from "@/lib/retrieval/processing/multiple"
import { FileItemSearchResult } from "@/types/ml-server-communication"
import {
  BasicRuleComparisonResults,
  QueryRelatedMetadata
} from "@/types/retriever"
import {
  createChatCollectionCreator,
  createCollection,
  getChatCollectionCreator
} from "@/db/collections"

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
    const stream: ReadableStream<Uint8Array> = OpenAIStream(response)
    yield stream
  }
}

export async function POST(request: Request) {
  const json = await request.json()
  const { chatId, workspaceId, chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: Array<{
      content: string
      role: string
    }>
    chatId: string
    workspaceId: string
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
    // The whole message history is passed every time
    const fileQuery = messages[messages.length - 1].content
    /* What is the plan:
     * Rewrite the latest user message based on the theme of the corpus + previous user messages.
     * Use the last user message to retrieve filesRaw
     * */

    // Use local embeddings for file retrieval
    /* const localEmbedding = await generateBgeLocalEmbedding(fileQuery)

    const { data: localFileItems, error: localFileItemsError } =
      await supabaseAdmin.rpc("match_file_items_any_bge", {
        query_embedding: localEmbedding as any,
        min_layer_number: 1
      })

    if (localFileItemsError) {
      throw localFileItemsError
    }*/

    let localFileItems = await searchFilesMLServer(
      supabaseAdmin as any,
      fileQuery
    )

    const mostSimilarChunks = localFileItems?.sort((a, b) => b.score - a.score)

    type ExtendedFile = Tables<"files"> & {
      chunks: FileItemSearchResult[]
      avg_chunk_relevance_score: number
      basic_rule_relevance_score?: number
      basic_rule_info?: BasicRuleComparisonResults
      score: number
      already_queried?: boolean
      query_related_metadata?: Json[]
    }
    let filesFound: ExtendedFile[]
    // Map chunks to filesRaw
    const { data: filesRaw, error: filesError } = await supabaseAdmin
      .from("files")
      .select("*")
      .in(
        "id",
        mostSimilarChunks?.map(chunk => chunk.file_id)
      )

    const { data: basicRulesData, error: basicRulesError } =
      await supabaseAdmin.rpc("rank_files", {
        file_ids: filesRaw?.map(file => file.id)
      })
    filesFound =
      filesRaw?.map((file, index) => {
        let relevantFile = file as ExtendedFile
        if (!basicRulesError && basicRulesData) {
          // Add basic rules info
          let basicRulesFile = basicRulesData.find(item => item.id === file.id)
          if (basicRulesFile) {
            relevantFile.basic_rule_info =
              basicRulesFile.comparison_results as any
            relevantFile.basic_rule_relevance_score = basicRulesFile.total_score // format: 0.343523
          }
        }
        // TODO: Add advanced filters
        // Reverse sort file chunks
        const fileChunks = mostSimilarChunks
          ?.filter(chunk => chunk.file_id === file.id)
          .sort((a, b) => b.score - a.score)
        // Add the first 5 chunks of a file to filesRaw
        relevantFile.chunks = fileChunks?.slice(0, 5) ?? []
        relevantFile.avg_chunk_relevance_score =
          relevantFile.chunks.length > 0
            ? relevantFile.chunks.reduce((acc, cur) => acc + cur.score, 0) /
              relevantFile.chunks.length
            : 0 // format: 0.343523
        relevantFile.score = relevantFile.avg_chunk_relevance_score
        if (relevantFile.basic_rule_relevance_score) {
          //relevantFile.score = relevantFile.score * 0.5 + relevantFile.basic_rule_relevance_score * 0.5
        }
        return relevantFile
      }) ?? []
    // Reverse sort whole file relevance score
    filesFound.sort((a, b) => b.score - a.score)

    const { data: currentChatFiles } = await supabaseAdmin
      .from("chat_files")
      .select("*")
      .eq("chat_id", chatId!)
      .eq("user_id", profile.user_id)

    if (currentChatFiles) {
      filesFound.forEach(retrievedFile => {
        let existingChatFile = currentChatFiles.find(
          currentFile => currentFile.file_id === retrievedFile.id
        )
        // not undefined -> defined
        retrievedFile.already_queried = !!existingChatFile
        retrievedFile.query_related_metadata =
          existingChatFile?.query_related_metadata as any
      })
    }

    /* The idea is to save:
     * 1. Rule compliance for the file - basic and advanced
     * 2. Highlights given the search in jsonObject[]
     * 3. Query related metadata - { "User Query": { chunkRelevance, chunkList, LLM_Summary } }
     */

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
            "Today is 03/07/2024.\n\nUser Instructions:\nYou are a friendly, helpful AI assistant."
        },
        {
          role: "user",
          content:
            "I have the following question: " +
            fileQuery +
            "\n\n" +
            "Here are relevant sections from a document:\n" +
            +"<DOCUEMENT SECTIONS>\n" +
            file.chunks?.map(item => `${item.content}`).join("\n\n") +
            "\n</DOCUEMENT SECTIONS>\n" +
            "Start your answers with 'Given your question, the document was found to address the following:'\n" +
            "Using markdown formatting, give me the main topic of the document and if it's relevant to the question.\n" +
            "Aditionally, with bullet points please tell me what relevant for the question information do the document sections contain."
        }
      ])

      let updateChatFiles: TablesInsert<"chat_files">[] = filesFound.map(
        file => ({
          chat_id: chatId,
          file_id: file.id,
          user_id: profile.user_id,
          score_metadata: {
            basic_rule_info: file.basic_rule_info,
            basic_rule_relevance: file.basic_rule_relevance_score
          },
          query_related_metadata: [
            ...(file.query_related_metadata ?? []),
            {
              file_query: fileQuery,
              metadata: {
                average_chunk_relevance: file.avg_chunk_relevance_score,
                score: file.score,
                chunk_ids: file.chunks.map(chunk => chunk.id),
                summary: ""
              }
            }
          ] as QueryRelatedMetadata[]
        })
      )

      let currentChatCollectionCreator = await getChatCollectionCreator(
        chatId,
        supabaseAdmin
      )
      if (!currentChatCollectionCreator) {
        const firstUserMessage = messages.find(msg => msg.role === "user")

        const createdCollection = await createCollection(
          {
            description: `The verified relevant files collection for '${firstUserMessage?.content ?? fileQuery}'`,
            name: firstUserMessage?.content ?? fileQuery,
            user_id: profile.user_id
          },
          workspaceId,
          supabaseAdmin
        )
        if (createdCollection) {
          await createChatCollectionCreator(
            {
              chat_id: chatId,
              collection_id: createdCollection.id,
              user_id: profile.user_id
            },
            supabaseAdmin
          )
        }
      }

      const { error: updateChatFilesError } = await supabaseAdmin
        .from("chat_files")
        .upsert(updateChatFiles)

      const encoder = new TextEncoder()
      let decoder = new TextDecoder("utf-8")
      let index = 0
      const readableStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(
            encoder.encode(
              `We found ${filesFound.length} potentially relevant files to your query:\n\n\n\n`
            )
          )

          const generator = getStreamingResponses(
            groq,
            chatSettings,
            messagesArray
          )

          try {
            let generatedText = ""
            for await (const stream of generator) {
              let relevantFile = filesFound[index]
              let avgChunkRelevance = Math.round(
                relevantFile.avg_chunk_relevance_score * 10
              ) // format: 3
              let basicRuleRelevance = Math.round(
                (relevantFile.basic_rule_relevance_score ?? 0) * 10
              ) // format: 3
              let totalScore = Math.round(relevantFile.score * 10) // format: 3

              controller.enqueue(
                encoder.encode(
                  `\`\`\`chatfilemetadata\n` +
                    JSON.stringify({
                      fileName: relevantFile.name,
                      fileId: relevantFile.id,
                      duplicateReference: relevantFile.already_queried
                    }) +
                    `\n\`\`\`\n\n` +
                    `Relevance: ${totalScore}/10 ` +
                    `(Vector Search: ${avgChunkRelevance}/10; Company Rules: ${basicRuleRelevance}/10)\n\n` +
                    `Company rule breakdown:\n\`\`\`json\n${JSON.stringify(relevantFile.basic_rule_info ?? {}, null, 4)}\n\`\`\`\n\n`
                )
              )
              // @ts-ignore
              for await (const chunk of stream) {
                generatedText += decoder.decode(chunk)
                controller.enqueue(chunk)
              }
              // Line end
              controller.enqueue(encoder.encode("\n\n******\n\n"))
              const { data, error } = await supabaseAdmin
                .from("chat_files")
                .update({
                  query_related_metadata: [
                    ...(relevantFile.query_related_metadata ?? []),
                    {
                      file_query: fileQuery,
                      metadata: {
                        average_chunk_relevance:
                          relevantFile.avg_chunk_relevance_score,
                        score: relevantFile.score,
                        chunk_ids: relevantFile.chunks.map(chunk => chunk.id),
                        summary: generatedText
                      }
                    }
                  ] as QueryRelatedMetadata[]
                })
                .eq("chat_id", chatId!)
                .eq("file_id", relevantFile.id)
              generatedText = ""
              index++
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
  } catch (error: any) {
    const errorMessage =
      error.error?.message || error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
