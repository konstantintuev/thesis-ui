export const handleRewriteQueryMLServer = async (
  userInput: string,
  previousUserMessages: string[]
) => {
  const response = await fetch(
    `${process.env["ML_SERVER_URL"]}/query_processor/rewrite_query`,
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
