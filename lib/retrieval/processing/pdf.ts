import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import {
  ExtractedItemHtml,
  Metadata,
  Tree,
  UUIDExtractedItemDict
} from "@/types/file-processing"

function extractUUIDs(input: string): string[] {
  const uuidRegex =
    /\b[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\b/g
  const matches = input.match(uuidRegex)
  return matches ? matches : []
}

export const processPdf = async (
  pdf: Blob
): Promise<[FileItemChunk[], Metadata, UUIDExtractedItemDict]> => {
  const formData = new FormData()
  formData.append("file", pdf)

  const response = await fetch(
    "http://127.0.0.1:8000/file_processing/pdf_to_chunks",
    {
      method: "POST",
      body: formData
    }
  )

  if (!response.ok) {
    throw new Error(`Error: Received status code ${response.status}`)
  }

  const responseData = await response.json()
  const uuid_items = responseData.uuid_items as UUIDExtractedItemDict

  const tree: Tree = responseData.tree
  const metadata = responseData.metadata as Metadata

  const sortedKeys = Object.keys(tree)
    .map(Number)
    .sort((a, b) => a - b)
  // Handle success - e.g., show the uploaded file URL
  let chunks: FileItemChunk[] = []

  for (let i = 0; i < sortedKeys.length; i++) {
    const doc = tree[i]

    let uuidsInChunk = extractUUIDs(doc.text).filter(uuid => uuid in uuid_items)

    chunks.push({
      index: i,
      content: doc.text,
      tokens: encode(doc.text).length,
      children: doc.children,
      embedding: doc.embedding,
      layer: doc.layer,
      uuidsInChunk: uuidsInChunk
    })
  }

  return [chunks, metadata, uuid_items]
}
