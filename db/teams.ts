import { supabase } from "@/lib/supabase/browser-client"
import { Database, TablesInsert, TablesUpdate } from "@/supabase/types"
import { SupabaseClient } from "@supabase/supabase-js"
import { TeamAndMe } from "@/components/sidebar/items/teams/teams-select"

export const getTeams = async (
  supabaseInstance?: SupabaseClient<Database>
): Promise<TeamAndMe[]> => {
  const { data: teams, error } = await (supabaseInstance ?? supabase)
    .from("teams")
    .select(
      `
        *,
        team_members(user_id)
    `
    )
    .order("created_at", { ascending: false })

  if (!teams) {
    throw new Error(error.message)
  }

  return teams.map(team => ({
    ...team,
    // Each team has at least one member, but only members can see that
    has_me: team.team_members.length > 0
  }))
}

export const updateTeam = async (
  team_id: string,
  team: TablesUpdate<"teams">,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: updatedTeam, error } = await (supabaseInstance ?? supabase)
    .from("teams")
    .update(team)
    .eq("id", team_id)

  if (error) {
    throw new Error(error.message)
  }

  return updatedTeam
}

export const createTeam = async (
  team: TablesInsert<"teams">,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: updatedTeam, error } = await (supabaseInstance ?? supabase)
    .from("teams")
    .insert(team)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedTeam
}

export const deleteTeam = async (teamId: string) => {
  const response = await supabase.from("teams").delete().eq("id", teamId)

  if (response.count !== 1 || response.error) {
    return false
  }

  return true
}

export const getTeamMembersByTeamId = async (
  teamId: string,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: teamMembers, error } = await (supabaseInstance ?? supabase)
    .from("team_members")
    .select(`*`)
    .eq("team_id", teamId)

  if (!teamMembers) {
    throw new Error(error.message)
  }

  return teamMembers
}

export const removeTeamMember = async (
  teamId: string,
  userId: string,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { error } = await (supabaseInstance ?? supabase)
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export const addTeamMember = async (
  team: TablesInsert<"team_members">,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { error } = await (supabaseInstance ?? supabase)
    .from("team_members")
    .insert(team)

  if (error) {
    throw new Error(error.message)
  }
}

export const getChatSharedWithTeams = async (chatId: string) => {
  const { data: teamChat, error } = await supabase
    .from("team_chats")
    .select(
      `
        *,
        teams(*)
    `
    )
    .eq("chat_id", chatId)

  if (!teamChat) {
    throw new Error(error.message)
  }

  return teamChat
}

export const addTeamChat = async (teamChat: TablesInsert<"team_chats">) => {
  const { error } = await supabase.from("team_chats").insert(teamChat)

  if (error) {
    throw new Error(error.message)
  }
}

export const deleteTeamChat = async (
  teamId: string,
  chatId: string,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { error } = await (supabaseInstance ?? supabase)
    .from("team_chats")
    .delete()
    .eq("team_id", teamId)
    .eq("chat_id", chatId)

  if (error) {
    throw new Error(error.message)
  }
}
