import { LLM } from "@/types"

const File_retrieverLlm: LLM = {
  modelId: "file_retriever",
  modelName: "File Retriever Chat",
  provider: "file_retriever",
  hostedId: "file_retriever",
  platformLink: "this",
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0,
    outputCost: 0
  }
}

export const FILE_RETRIEVER_LLM_LIST: LLM[] = [File_retrieverLlm]
