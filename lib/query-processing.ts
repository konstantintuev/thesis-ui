export const handleRewriteQueryMLServer = async (
  userInput: string,
  previousUserMessages: string[]
) => {
  const response = await fetch(
    "http://127.0.0.1:8000/file_processing/rewrite_query",
    {
      method: "POST",
      body: JSON.stringify({
        query: userInput,
        previous_queries: previousUserMessages
      })
    }
  )

  if (!response.ok) {
    console.error("Error rewriting query:", response)
  }
  return await response.text()
}
