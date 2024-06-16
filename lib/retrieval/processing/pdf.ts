import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import {
  ExtractedItemHtml,
  Metadata,
  Tree,
  UUIDExtractedItemDict
} from "@/types/file-processing"

import { Agent, fetch, FormData } from "undici"

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

  // wait 15 minutes
  const timeout = 15 * 60 * 1000
  const response = await fetch(
    "http://127.0.0.1:8000/file_processing/pdf_to_chunks",
    {
      method: "POST",
      body: formData,
      dispatcher: new Agent({
        /** The amount of time, in milliseconds, the parser will wait to receive the complete HTTP headers (Node 14 and above only). Default: `300e3` milliseconds (300s). */
        headersTimeout: timeout,
        /** TODO */
        connectTimeout: timeout,
        /** The timeout after which a request will time out, in milliseconds. Monitors time between receiving body data. Use `0` to disable it entirely. Default: `300e3` milliseconds (300s). */
        bodyTimeout: timeout,
        /** the timeout, in milliseconds, after which a socket without active requests will time out. Monitors time between activity on a connected socket. This value may be overridden by *keep-alive* hints from the server. Default: `4e3` milliseconds (4s). */
        keepAliveTimeout: timeout,
        /** the maximum allowed `idleTimeout`, in milliseconds, when overridden by *keep-alive* hints from the server. Default: `600e3` milliseconds (10min). */
        keepAliveMaxTimeout: timeout,
        /** A number of milliseconds subtracted from server *keep-alive* hints when overriding `idleTimeout` to account for timing inaccuracies caused by e.g. transport latency. Default: `1e3` milliseconds (1s). */
        keepAliveTimeoutThreshold: timeout
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Error: Received status code ${response.status}`)
  }

  const responseData = (await response.json()) as any
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
