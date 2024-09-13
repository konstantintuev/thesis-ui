import { supabase } from "@/lib/supabase/browser-client"
import { Database, Tables, TablesInsert, TablesUpdate } from "@/supabase/types"
import { SupabaseClient } from "@supabase/supabase-js"

export const getFoldersByWorkspaceId = async (
  workspaceId: string,
  userWorkspaces: Tables<"workspaces">[]
) => {
  let { data: folders, error } = await supabase.from("folders").select("*")

  const ownWorkspaceIds = userWorkspaces.map(it => it.id)
  folders =
    folders
      ?.map(folder => {
        // either not in any (team folder)
        if (!ownWorkspaceIds.includes(folder.workspace_id)) {
          // @ts-ignore
          folder.from_team = true
          return folder
          // ... or in the workspace or
        } else if (folder.workspace_id === workspaceId) {
          return folder
        } else {
          return undefined
        }
      })
      .filter(item => !!item) ?? null

  if (!folders) {
    throw new Error(error?.message)
  }

  return folders ?? []
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
