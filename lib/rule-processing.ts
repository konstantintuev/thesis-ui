export async function text2Query(comparisonText: string): Promise<any[]> {
  const response = await fetch("/api/rules", {
    method: "POST",
    body: JSON.stringify({
      comparisonText: comparisonText
    })
  })

  let out = await response.json()

  if (!response.ok) {
    throw new Error(out.message ?? `Server is not responding.`)
  }

  return out
}
