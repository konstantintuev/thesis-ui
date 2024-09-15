import { handleRewriteQueryMLServer } from "@/lib/query-processing"

export const runtime = "edge"

export async function POST(request: Request) {
  const json = (await request.json()) as {
    userInput: string
    previousUserMessages: string[]
  }
  const { userInput, previousUserMessages } = json

  try {
    let res = await handleRewriteQueryMLServer(userInput, previousUserMessages)

    return new Response(res, {
      status: 200
    })
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
