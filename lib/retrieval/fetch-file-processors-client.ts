import { FileProcessor } from "@/types/file-processing"

export const fetchFileProcessorsClient = async () => {
  try {
    const response = await fetch(
      `/api/retrieval/file_processors`,
      {
        method: "GET"
      }
    )

    if (!response.ok) {
      throw new Error(`Server is not responding.`)
    }

    const data = (await response.json()) as FileProcessor[]

    return data
  } catch (error) {
    console.warn("Error fetching file processors: " + error)
  }
}
