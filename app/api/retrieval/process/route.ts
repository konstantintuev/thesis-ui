import { generateLocalEmbedding } from "@/lib/generate-local-embedding"
import {
  processCSV,
  processJSON,
  processMarkdown,
  processPdf,
  processTxt
} from "@/lib/retrieval/processing"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database, Json } from "@/supabase/types"
import { FileItemChunk } from "@/types"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { AttachableContent } from "@/types/retriever"

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    const formData = await req.formData()

    const file_id = formData.get("file_id") as string
    const embeddingsProvider = formData.get("embeddingsProvider") as string

    const { data: fileMetadata, error: metadataError } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("id", file_id)
      .single()

    if (metadataError) {
      throw new Error(
        `Failed to retrieve file metadata: ${metadataError.message}`
      )
    }

    if (!fileMetadata) {
      throw new Error("File not found")
    }

    if (fileMetadata.user_id !== profile.user_id) {
      throw new Error("Unauthorized")
    }

    const { data: file, error: fileError } = await supabaseAdmin.storage
      .from("files")
      .download(fileMetadata.file_path)

    if (fileError)
      throw new Error(`Failed to retrieve file: ${fileError.message}`)

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const blob = new Blob([fileBuffer])
    const fileExtension = fileMetadata.name.split(".").pop()?.toLowerCase()

    if (embeddingsProvider === "openai") {
      try {
        if (profile.use_azure_openai) {
          checkApiKey(profile.azure_openai_api_key, "Azure OpenAI")
        } else {
          checkApiKey(profile.openai_api_key, "OpenAI")
        }
      } catch (error: any) {
        error.message =
          error.message +
          ", make sure it is configured or else use local embeddings"
        throw error
      }
    }

    let chunksOld: FileItemChunk[] = []

    switch (fileExtension) {
      case "csv":
        chunksOld = await processCSV(blob)
        break
      case "json":
        chunksOld = await processJSON(blob)
        break
      case "md":
        chunksOld = await processMarkdown(blob)
        break
      case "pdf":
        // TODO: replace
        break
      case "txt":
        chunksOld = await processTxt(blob)
        break
      default:
        return new NextResponse("Unsupported file type", {
          status: 400
        })
    }

    let [chunks, metadata, uuid_items] = await processPdf(blob)

    // add attachable content entries for each chunk
    // -> for each chunk create an entry in the attachable content table with all the applicable UUIDs
    let file_items = await Promise.all(
      chunks.map(async (chunk, index) => {
        let out = {
          chunk_index: chunk.index,
          file_id: file_id,
          user_id: profile.user_id,
          content: chunk.content,
          tokens: chunk.tokens,
          openai_embedding: null,
          local_embedding: chunk.embedding as any,
          layer_number: chunk.layer,
          chunk_attachable_content: null
        }
        let uuidsInChunk = chunk.uuidsInChunk
        if (uuidsInChunk && uuidsInChunk.length > 0) {
          let attachableContent: AttachableContent = {}
          for (let uuidWeUseInText of uuidsInChunk) {
            attachableContent[uuidWeUseInText] = uuid_items[uuidWeUseInText]
          }
          const { data: attachableContentRes, error: attachableContentError } =
            await supabaseAdmin
              .from("file_items_attachable_content")
              .upsert({
                content: attachableContent as any
              })
              .select("id")
              .single()
          if (!attachableContentError) {
            // @ts-ignore
            out.chunk_attachable_content = attachableContentRes.id
          }
        }
        // find if the current chunk is a child of another chunk
        //let parent = chunks.find((chunk) => chunk.children?.includes(index));
        return out
      })
    )

    // after adding all file items, update the layer == 0 with list of parents

    /*const file_items = chunks.map((chunk, index) => ({
          file_id,
          user_id: profile.user_id,
          content: chunk.content,
          tokens: chunk.tokens,
          openai_embedding: null,
          local_embedding: chunk.embedding as any,
        }))*/

    let result = await supabaseAdmin
      .from("file_items")
      .upsert(file_items)
      .select()

    if (!result.error) {
      await Promise.all(
        result.data.map(async (item, index) => {
          if (item.layer_number && item.chunk_index && item.layer_number > 0) {
            // has children, find them by index in the original data set
            let children = chunks[item.chunk_index].children
              ?.map(childIndex => {
                return result.data?.find(
                  potentialChild => potentialChild.chunk_index === childIndex
                )?.id
              })
              .filter(child => child)
            if (children) {
              await supabaseAdmin
                .from("file_items")
                .update({ children: children as any })
                .eq("id", item.id)
            }
          }
        })
      )
    }

    const totalTokens = file_items.reduce((acc, item) => acc + item.tokens, 0)

    await supabaseAdmin
      .from("files")
      .update({ tokens: totalTokens, metadata: metadata as any })
      .eq("id", file_id)

    return new NextResponse("Embed Successful", {
      status: 200
    })
  } catch (error: any) {
    console.log(`Error in retrieval/process: ${error.stack}`)
    const errorMessage = error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
