import { supabase } from "@/lib/supabase/browser-client"
import { Database, Tables, TablesInsert, TablesUpdate } from "@/supabase/types"
import { SupabaseClient } from "@supabase/supabase-js"

export const getFoldersByWorkspaceId = async (
  workspaceId: string,
  userWorkspaces: Tables<"workspaces">[]
) => {
  const { data: folders, error } = await supabase
    .from("folders")
    .select("*")
    // either chat is in the workspace or not in any user workspace as shared by team
    .or(
      `workspace_id.eq.${workspaceId},workspace_id.not.in.(${userWorkspaces.map(it => it.id).join(",")})`
    )

  if (!folders) {
    throw new Error(error.message)
  }

  return folders
}

export const createFolder = async (
  folder: TablesInsert<"folders">,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: createdFolder, error } = await (supabaseInstance ?? supabase)
    .from("folders")
    .insert([folder])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdFolder
}

export const updateFolder = async (
  folderId: string,
  folder: TablesUpdate<"folders">
) => {
  const { data: updatedFolder, error } = await supabase
    .from("folders")
    .update(folder)
    .eq("id", folderId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedFolder
}

export const deleteFolder = async (folderId: string) => {
  const { error } = await supabase.from("folders").delete().eq("id", folderId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}
