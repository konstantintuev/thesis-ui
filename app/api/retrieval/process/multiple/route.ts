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
import OpenAI from "openai"
import { ExtractedItemHtml } from "@/types/file-processing"
import { fi } from "date-fns/locale"
import { processMultiple } from "@/lib/retrieval/processing/multiple"

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    const formData = await req.formData()

    const file_ids = formData.getAll("file_ids") as string[]
    const targetCollectionID = formData.get("targetCollectionID") as string
    const embeddingsProvider = formData.get("embeddingsProvider") as string

    const { data: filesMetadata, error: metadataError } = await supabaseAdmin
      .from("files")
      .select("*")
      .in("id", file_ids)

    if (metadataError) {
      throw new Error(
        `Failed to retrieve file metadata: ${metadataError.message}`
      )
    }

    if (!filesMetadata) {
      throw new Error("File not found")
    }

    if (filesMetadata.some(metadata => metadata.user_id !== profile.user_id)) {
      throw new Error("Unauthorized")
    }

    const { data: files, error: filesError } = await supabaseAdmin.storage
      .from("files")
      .createSignedUrls(
        filesMetadata.map(file => file.file_path),
        10 * 60
      ) // 10 mins

    if (filesError)
      throw new Error(`Failed to retrieve file: ${filesError.message}`)

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

    let upload_queue_id = await processMultiple(
      files?.map(it => it.signedUrl) ?? [],
      filesMetadata.map(it => it.id)
    )

    let result = await supabaseAdmin
      .from("file_upload_queue")
      .upsert({
        id: upload_queue_id,
        target_collection_id: targetCollectionID // TODO: check if valid
      })
      .select()

    if (result.error) {
      throw new Error("Failed to add entry to file_upload_queue table")
    }

    return new NextResponse(
      JSON.stringify({ multiple_file_queue_id: upload_queue_id }),
      {
        status: 200
      }
    )
  } catch (error: any) {
    console.log(`Error in retrieval/process: ${error.stack}`)
    const errorMessage = error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
