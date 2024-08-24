import { AttachableContent } from "@/types/retriever"
import { ContentItem, ListItem } from "@/types/file-processing"

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
