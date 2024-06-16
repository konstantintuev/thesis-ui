import { Metadata, Tree, UUIDExtractedItemDict } from "@/types/file-processing"

export type MultipleFilesQueueResult = [
  {
    file_uuid: string
    status: string
    result: {
      uuid_items: UUIDExtractedItemDict
      tree: Tree
      metadata: Metadata
    }
  }
]
