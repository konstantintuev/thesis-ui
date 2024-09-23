import {fetchFileProcessorsMLServer} from "@/lib/retrieval/fetch-file-processors-server";

export async function GET(request: Request) {
  try {
    let fileProcessors = await fetchFileProcessorsMLServer()

    return new Response(
      JSON.stringify(fileProcessors),
      {
        status: 200
      }
    )
  } catch (error: any) {
    const errorMessage =
      error.error?.message || error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({message: errorMessage}), {
      status: errorCode
    })
  }
}