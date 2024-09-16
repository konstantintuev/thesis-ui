import { AttachableContent } from "@/types/retriever"
import { ContentItem, ListItem } from "@/types/file-processing"
import { FileItemSearchResult } from "@/types/ml-server-communication"
import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"

export const uuidPattern =
  /\b[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[1-5][0-9a-fA-F]{3}\b-[89abAB][0-9a-fA-F]{3}\b-[0-9a-fA-F]{12}\b/g

export function addUuidObjectToString(
  match: string,
  uuidItems: AttachableContent
): string {
  const uuid = match

  if (uuidItems[uuid]) {
    const item = uuidItems[uuid]
    switch (item.type) {
      case "ul": {
        const listMarker = "*"
        const listString =
          (item as ListItem).children
            ?.map(child => `${listMarker} ${child}`)
            .join("\n") ?? ""
        return `\n${listString}`
      }
      case "li": {
        const listString =
          (item as ListItem).children
            ?.map((child, index) => `${index + 1}. ${child}`)
            .join("\n") ?? ""
        return `\n${listString}`
      }
      case "table":
      case "math": {
        return `\n${(item as ContentItem).content ?? ""}`
      }
      default:
        return uuid
    }
  }

  return uuid
}

export async function addAttachableContent(
  supabaseAdmin: SupabaseClient<Database>,
  localFileItems: FileItemSearchResult[]
) {
  let mostSimilarChunks = localFileItems.sort((a, b) => b.score - a.score)
  return await Promise.all(
    mostSimilarChunks.map(async chunk => {
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
}
