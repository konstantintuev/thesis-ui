import { supabase } from "@/lib/supabase/browser-client"
import { Tables, TablesInsert, TablesUpdate } from "@/supabase/types"

export const getChatById = async (chatId: string) => {
  const { data: chat } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .maybeSingle()

  return chat
}

export const getChatsByWorkspaceId = async (
  workspaceId: string,
  userWorkspaces: Tables<"workspaces">[]
) => {
  let { data: chats, error } = await supabase
    .from("chats")
    .select("*")
    // either chat is in the workspace
    .order("created_at", { ascending: false })

  if (!chats) {
    throw new Error(error?.message)
  }

  const ownWorkspaceIds = userWorkspaces.map(it => it.id)
  chats =
    chats
      ?.map(chat => {
        // either not in any (team chat)
        if (!ownWorkspaceIds.includes(chat.workspace_id)) {
          // @ts-ignore
          chat.from_team = true
          return chat
          // ... or in the workspace or
        } else if (chat.workspace_id === workspaceId) {
          return chat
        } else {
          return undefined
        }
      })
      .filter(item => !!item) ?? null

  return chats
}

export const createChat = async (chat: TablesInsert<"chats">) => {
  const { data: createdChat, error } = await supabase
    .from("chats")
    .insert([chat])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdChat
}

export const createChats = async (chats: TablesInsert<"chats">[]) => {
  const { data: createdChats, error } = await supabase
    .from("chats")
    .insert(chats)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  return createdChats
}

export const updateChat = async (
  chatId: string,
  chat: TablesUpdate<"chats">
) => {
  const { data: updatedChat, error } = await supabase
    .from("chats")
    .update(chat)
    .eq("id", chatId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedChat
}

export const deleteChat = async (chatId: string) => {
  const { error } = await supabase.from("chats").delete().eq("id", chatId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}
