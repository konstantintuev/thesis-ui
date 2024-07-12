// noinspection BadExpressionStatementJS

import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import {
  ExtractedItemHtml,
  Metadata,
  Tree,
  UUIDExtractedItemDict
} from "@/types/file-processing"

import { SupabaseClient } from "@supabase/supabase-js/src"
import { Database, Tables, TablesInsert } from "@/supabase/types"
import {
  FileItemSearchResult,
  MultipleFilesQueueResult,
  SearchResults
} from "@/types/ml-server-communication"

export const processMultiple = async (
  fileURLs: string[],
  fileIDs: string[]
): Promise<string> => {
  const formData = new FormData()
  for (let fileURL of fileURLs) {
    formData.append("fileURLs", fileURL)
  }
  for (let fileID of fileIDs) {
    formData.append("fileIDs", fileID)
  }

  const response = await fetch(
    "http://127.0.0.1:8000/file_processing/files_to_chunks",
    {
      method: "POST",
      body: formData
    }
  )

  if (!response.ok) {
    throw new Error(`Error: Received status code ${response.status}`)
  }

  const responseData = (await response.json()) as any

  // sample: {"multiple_file_queue_id": "3a17f0de-77e7-4421-8489-722979b29b6f"}
  return responseData["multiple_file_queue_id"]
}

function extractUUIDs(input: string): string[] {
  const uuidRegex =
    /\b[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\b/g
  const matches = input.match(uuidRegex)
  return matches ? matches : []
}

export const processMultipleResult = async (
  supabaseAdmin: SupabaseClient<Database, "public", Database["public"]>,
  targetCollectionID: string,
  rawInput: MultipleFilesQueueResult
): Promise<string[]> => {
  const { data: fileInDB } = await supabaseAdmin
    .from("files")
    .select("*")
    .eq("id", rawInput[0].file_uuid)
    .single()
  if (!fileInDB) {
    throw new Error("File not found")
  }
  let res = await Promise.all(
    rawInput.map(async fileRes => {
      const responseData = fileRes.result
      const uuid_items = responseData.uuid_items as UUIDExtractedItemDict

      const tree: Tree = responseData.tree
      const metadata = responseData.metadata as Metadata

      const sortedKeys = Object.keys(tree)
        .map(Number)
        .sort((a, b) => a - b)

      // add attachable content entries for each chunk
      // -> for each chunk create an entry in the attachable content table with all the applicable UUIDs
      let file_items = await Promise.all(
        sortedKeys.map(async i => {
          const doc = tree[i]

          let uuidsInChunk = extractUUIDs(doc.text).filter(
            uuid => uuid in uuid_items
          )

          let out: TablesInsert<"file_items"> = {
            id: doc.id,
            chunk_index: i,
            file_id: fileRes.file_uuid,
            user_id: fileInDB.user_id,
            content: doc.text,
            tokens: encode(doc.text).length,
            openai_embedding: null,
            local_embedding: doc.embedding as any,
            layer_number: doc.layer,
            chunk_attachable_content: null,
            children: doc.children
          }

          if (uuidsInChunk && uuidsInChunk.length > 0) {
            let attachableContent: {
              [key: string]: ExtractedItemHtml
            } = {}
            for (let uuidWeUseInText of uuidsInChunk) {
              attachableContent[uuidWeUseInText] = uuid_items[uuidWeUseInText]
            }
            const {
              data: attachableContentRes,
              error: attachableContentError
            } = await supabaseAdmin
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
      await supabaseAdmin.from("file_items").upsert(file_items).select()

      const totalTokens = file_items.reduce((acc, item) => acc + item.tokens, 0)

      await supabaseAdmin
        .from("files")
        .update({ tokens: totalTokens, metadata: metadata as any })
        .eq("id", fileRes.file_uuid)

      return fileRes.file_uuid
    })
  )

  let collectionInfo = await supabaseAdmin
    .from("collections")
    .select("id")
    .eq("id", targetCollectionID)
    .single()

  if (collectionInfo.data && !collectionInfo.error) {
    await supabaseAdmin
      .from("collection_files")
      .insert(
        res.map(file_id => ({
          collection_id: targetCollectionID,
          file_id,
          user_id: fileInDB.user_id
        }))
      )
      .select("*")
  }

  return res
}

export const searchFilesMLServer = async (
  supabaseAdmin: SupabaseClient<Database, "public", Database["public"]>,
  query: string
): Promise<FileItemSearchResult[]> => {
  const response = await fetch(
    `http://127.0.0.1:8000/file_processing/search_query`,
    {
      method: "POST",
      body: JSON.stringify({ query: query })
    }
  )
  let res = (await response.json()) as SearchResults
  let fileItems = await Promise.all(
    res.map(async searchResult => {
      let { data } = await supabaseAdmin
        .from("file_items")
        .select("*")
        .eq("id", searchResult.document_metadata.chunk_id)
        .single()
      if (data) {
        let ret = data as FileItemSearchResult
        ret.score = searchResult.score
        ret.rank = searchResult.rank
        return ret
      }
      return null
    })
  )
  fileItems = fileItems.filter(
    fileItem => fileItem !== undefined && fileItem !== null
  )
  return fileItems as FileItemSearchResult[]
}
