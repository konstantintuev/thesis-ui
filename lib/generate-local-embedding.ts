import { pipeline } from "@xenova/transformers"
import OpenAI from "openai"

export async function generateLocalEmbedding(content: string) {
  const generateEmbedding = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  )

  const output = await generateEmbedding(content, {
    pooling: "mean",
    normalize: true
  })

  const embedding = Array.from(output.data)

  return embedding
}

export async function generateBgeLocalEmbedding(content: string) {
  let openai = new OpenAI({
    baseURL: `${process.env["ML_SERVER_URL"]}/file_processing`
  })
  const response = await openai.embeddings.create({
    model: "default",
    input: content
  })

  const openaiEmbedding = response.data.map(item => item.embedding)[0]

  return openaiEmbedding
}
