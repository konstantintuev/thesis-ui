import { FileProcessor } from "@/types/file-processing"

export const fetchFileProcessorsMLServer = async () => {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/file_processing/available_processors`,
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
