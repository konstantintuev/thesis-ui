import { TeamApiUpdate } from "@/types"

export async function getTeam(teamID: string): Promise<TeamApiUpdate> {
  const response = await fetch(
    "/api/team?" +
      new URLSearchParams({
        teamID
      }).toString()
  )

  let out = await response.json()

  if (!response.ok) {
    throw new Error(out.message ?? `Server is not responding.`)
  }

  return out
}

export async function updateTeam(
  updateState: TeamApiUpdate
): Promise<TeamApiUpdate> {
  const response = await fetch("/api/team", {
    method: "POST",
    body: JSON.stringify(updateState)
  })

  let out = await response.json()

  if (!response.ok) {
    throw new Error(out.message ?? `Server is not responding.`)
  }

  return out
}

export async function addTeam(
  updateState: TeamApiUpdate
): Promise<TeamApiUpdate> {
  const response = await fetch("/api/team", {
    method: "PUT",
    body: JSON.stringify(updateState)
  })

  let out = await response.json()

  if (!response.ok) {
    throw new Error(out.message ?? `Server is not responding.`)
  }

  return out
}
