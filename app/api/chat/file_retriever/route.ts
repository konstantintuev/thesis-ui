import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings, LLMID } from "@/types"
import { OpenAIStream } from "ai"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"
import { Database, TablesUpdate } from "@/supabase/types"
import { NextResponse } from "next/server"
import {
  ExtendedFileForSearch,
  QueryRelatedMetadata,
  FilterInfo
} from "@/types/retriever"
import {
  createChatCollectionCreator,
  createCollection,
  getChatCollectionCreator
} from "@/db/collections"
import { addAttachableContent } from "@/lib/retrieval/attachable-content"
import { refinedPrompt } from "@/app/api/chat/file_retriever/retriever-prompts"
import { groupChunks, retrieveFiles } from "@/lib/retrieval/retrieve-files"
import { applyAdvancedFilters } from "@/app/api/chat/file_retriever/apply-advanced-filters"
import { countOccurrences } from "@/lib/string-utils"

export const runtime = "edge"

async function* getStreamingResponses(
  openai: OpenAI,
  model: LLMID,
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
      model: model,
      messages: messages as any,
      max_tokens: 350,
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
      rewrittenMessage?: string
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
    let userMessages = messages.filter(msg => msg.role === "user")
    let lastMessage =
      userMessages[userMessages.length - 1] ?? messages[messages.length - 1]

    // The whole message history is passed every time
    const fileQuery = lastMessage?.rewrittenMessage ?? lastMessage?.content

    /* What is the plan:
     * Rewrite the latest user message based on the theme of the corpus + previous user messages.
     * Use the last user message to retrieve filesRaw
     * */

    // Use local embeddings for file retrieval

    let localFileItems = await retrieveFiles(
      chatSettings.embeddingsProvider,
      fileQuery,
      supabaseAdmin,
      profile
    )

    let mostSimilarChunks = await addAttachableContent(
      supabaseAdmin,
      localFileItems
    )

    let filesFound: ExtendedFileForSearch[]
    const filesRaw = await groupChunks(supabaseAdmin, mostSimilarChunks)

    const { data: basicRulesData, error: basicRulesError } =
      await supabaseAdmin.rpc("rank_files", {
        file_ids: filesRaw?.map(file => file.id)
      })

    filesFound = filesRaw.map((file, index) => {
      let relevantFile = file as ExtendedFileForSearch

      if (!basicRulesError && basicRulesData) {
        // Add basic rules info
        let basicRulesFile = basicRulesData.find(item => item.id === file.id)
        if (
          basicRulesFile &&
          basicRulesFile.comparison_results &&
          basicRulesFile.total_score
        ) {
          relevantFile.basic_rule_info = Object.fromEntries(
            Object.entries(
              basicRulesFile.comparison_results as { [it: string]: boolean }
            ).map(([key, value]) => [
              key, // retain the key
              { score: value } as FilterInfo
            ])
          )
          relevantFile.basic_rule_relevance_score = basicRulesFile.total_score // format: 0.343523
        }
      }

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
    })

    filesFound = filesFound
      // At least 9% relevance
      .filter(file => file.score > 0.09)
      // Reverse sort whole file relevance score
      .sort((a, b) => b.score - a.score)

    const { data: currentChatFiles } = await supabaseAdmin
      .from("chat_files")
      .select("*")
      .eq("chat_id", chatId!)

    if (currentChatFiles) {
      filesFound.forEach(retrievedFile => {
        let existingChatFile = currentChatFiles.find(
          currentFile => currentFile.file_id === retrievedFile.id
        )
        // not undefined -> defined
        retrievedFile.already_queried = !!existingChatFile
        retrievedFile.query_related_metadata =
          existingChatFile?.query_related_metadata as any

        if (retrievedFile.query_related_metadata) {
          retrievedFile.query_related_metadata =
            retrievedFile.query_related_metadata.filter(
              metadata =>
                // If the sequence_number we are about to set (messages.length - 1) is superseded => ignore
                !(
                  metadata.sequence_number &&
                  metadata.sequence_number >= messages.length - 1
                )
            )
        }
      })
    }

    /* The idea is to save:
     * 1. Rule compliance for the file - basic and advanced
     * 2. Highlights given the search in jsonObject[]
     * 3. Query related metadata - { "User Query": { chunkRelevance, chunkList, LLM_Summary } }
     */

    try {
      const profile = await getServerProfile()

      checkApiKey(profile.azure_openai_api_key, "Azure OpenAI")

      const ENDPOINT = profile.azure_openai_endpoint
      const KEY = profile.azure_openai_api_key
      const DEPLOYMENT_ID = profile.azure_openai_45_vision_id || ""
      const model: LLMID = "gpt-4o"

      if (!ENDPOINT || !KEY || !DEPLOYMENT_ID) {
        return new Response(
          JSON.stringify({ message: "Azure resources not found" }),
          {
            status: 400
          }
        )
      }

      const azureOpenai = new OpenAI({
        apiKey: KEY,
        baseURL: `${ENDPOINT}/openai/deployments/${DEPLOYMENT_ID}`,
        defaultQuery: { "api-version": "2023-12-01-preview" },
        defaultHeaders: { "api-key": KEY }
      })

      // for each file run summary and return streaming text response
      //  -> when the stream ends, replace with new stream of next file
      const messagesArray = filesFound.map((file, index) => [
        {
          role: "system",
          content: refinedPrompt
        },
        {
          role: "user",
          content:
            "I have the following question:\n\n" +
            fileQuery +
            "\n\n" +
            "I have found the following document sections, which might help answer my question.\n" +
            "Could you review them, please?\n" +
            +"<DOCUMENT SECTIONS>\n" +
            file.chunks?.map(item => `${item.content}`).join("\n\n") +
            "\n</DOCUMENT SECTIONS>"
        }
      ])

      let updateChatFiles: TablesUpdate<"chat_files">[] = filesFound.map(
        file => {
          return {
            chat_id: chatId,
            file_id: file.id,
            // Don't update the creator/owner
            user_id: file.already_queried ? undefined : profile.user_id,
            // Update company rules
            score_metadata: {
              basic_rule_info: file.basic_rule_info,
              basic_rule_relevance: file.basic_rule_relevance_score
            },
            // Add metadata of latest query
            query_related_metadata: [
              ...(file.query_related_metadata ?? []),
              {
                file_query: fileQuery,
                metadata: {
                  average_chunk_relevance: file.avg_chunk_relevance_score,
                  score: file.score,
                  chunk_ids: file.chunks.map(chunk => chunk.id),
                  summary: ""
                },
                sequence_number: messages.length - 1
              }
            ] as QueryRelatedMetadata[],
            // Don't update belonging message sequence number for delete
            sequence_number: file.already_queried
              ? undefined
              : messages.length - 1
          }
        }
      )

      let currentChatCollectionCreator = await getChatCollectionCreator(
        chatId,
        supabaseAdmin
      )
      if (!currentChatCollectionCreator) {
        const firstUserMessage = userMessages[0]

        let shortTitle = (firstUserMessage?.content ?? fileQuery).substring(
          0,
          18
        )
        const createdCollection = await createCollection(
          {
            description: `The verified relevant files collection for ChatID: ${chatSettings} - '${shortTitle}'`,
            name: `${new Date().toLocaleDateString()}: Verified of ${shortTitle}`,
            user_id: profile.user_id,
            hidden: true
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
        // We are not actually inserting files without relevant keys, just update them
        .upsert(updateChatFiles as any)

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
            azureOpenai,
            model,
            chatSettings,
            messagesArray
          )

          try {
            let generatedText = ""
            for await (const stream of generator) {
              let relevantFile = filesFound[index]

              // We can do that for all files, but better do it file by file
              //  as it invokes an LLM and takes time
              let advRuleAppliedFiles = await applyAdvancedFilters(
                chatSettings.embeddingsProvider,
                supabaseAdmin,
                profile,
                [relevantFile.id]
              )

              let advRuleFile = advRuleAppliedFiles[relevantFile.id]
              if (advRuleFile) {
                relevantFile.advanced_rule_info = advRuleFile.advanced_rule_info
                relevantFile.advanced_rules_relevance_score =
                  advRuleFile.advanced_rules_relevance_score // format: 0.343523
              }

              let avgChunkRelevance = (
                relevantFile.avg_chunk_relevance_score * 100
              ).toFixed(1) // format: 13.5%

              let basicRuleRelevance = (
                (relevantFile.basic_rule_relevance_score ?? 0) * 100
              ).toFixed(1) // format: 13.5%

              let advRuleRelevance = (
                (relevantFile.advanced_rules_relevance_score ?? 0) * 100
              ).toFixed(1) // format: 13.5%

              // TODO: Weight all scores available
              let totalScore = (relevantFile.score * 100).toFixed(1) // format: 13.5%

              controller.enqueue(
                encoder.encode(
                  `\`\`\`chatfilemetadata\n` +
                    JSON.stringify({
                      fileName: relevantFile.name,
                      fileId: relevantFile.id,
                      duplicateReference: relevantFile.already_queried
                    }) +
                    `\n\`\`\`\n\n` +
                    `**Relevance Score**: ${totalScore}% ` +
                    `(**Semantic Search Score**: ${avgChunkRelevance}%; **Metadata Rules Score**: ${basicRuleRelevance}%; **Advanced Rules Score**: ${advRuleRelevance}%)\n\n` +
                    "<details>\n" +
                    "<summary>Company rule breakdown:</summary>\n\n" +
                    `\`\`\`chatfilecompanyrules\n${JSON.stringify(
                      {
                        ...(relevantFile.advanced_rule_info ?? {}),
                        ...(relevantFile.basic_rule_info ?? {})
                      },
                      null,
                      4
                    )}\n\`\`\`\n\n` +
                    "</details>\n" +
                    "<br/>\n"
                )
              )
              // @ts-ignore
              for await (const chunk of stream) {
                generatedText += decoder.decode(chunk)
                controller.enqueue(chunk)
              }

              let amountOfSummaryOpens = countOccurrences(
                generatedText,
                "<summary>"
              )
              let amountOfSummaryCloses = countOccurrences(
                generatedText,
                "</summary>"
              )
              if (amountOfSummaryOpens > amountOfSummaryCloses) {
                for (
                  let i = 0;
                  i < amountOfSummaryOpens - amountOfSummaryCloses;
                  i++
                ) {
                  generatedText += "\n</summary>"
                  controller.enqueue(encoder.encode("\n</summary>"))
                }
              }

              let amountOfDetailOpens = countOccurrences(
                generatedText,
                "<details>"
              )
              let amountOfDetailCloses = countOccurrences(
                generatedText,
                "</details>"
              )
              if (amountOfDetailOpens > amountOfDetailCloses) {
                for (
                  let i = 0;
                  i < amountOfDetailOpens - amountOfDetailCloses;
                  i++
                ) {
                  generatedText += "\n</details>"
                  controller.enqueue(encoder.encode("\n</details>"))
                }
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
                      },
                      sequence_number: messages.length - 1
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
          "API Key not found. Please set it in your profile settings."
      } else if (errorCode === 401) {
        errorMessage =
          "API Key is incorrect. Please fix it in your profile settings."
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
