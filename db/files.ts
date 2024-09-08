import { supabase } from "@/lib/supabase/browser-client"
import { Tables, TablesInsert, TablesUpdate } from "@/supabase/types"
import mammoth from "mammoth"
import { toast } from "sonner"
import { uploadFile } from "./storage/files"

export const getFileById = async (fileId: string) => {
  const { data: file, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .single()

  if (!file) {
    throw new Error(error.message)
  }

  return file
}

export const getFileWorkspacesByWorkspaceId = async (workspaceId: string) => {
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(
      `
      id,
      name,
      files (*)
    `
    )
    .eq("id", workspaceId)
    .single()

  const { data: teamData, error: teamError } = await supabase
    .from("files")
    .select(
      `
      *
    `
    )
    .not("id", "in", `(${(workspace?.files.map(it => it.id) ?? []).join(",")})`)

  if (!workspace) {
    throw new Error(error.message)
  }

  workspace.files = workspace.files.concat(teamData ?? [])

  return workspace
}

export const getFileWorkspacesByFileId = async (fileId: string) => {
  const { data: file, error } = await supabase
    .from("files")
    .select(
      `
      id, 
      name, 
      workspaces (*)
    `
    )
    .eq("id", fileId)
    .single()

  if (!file) {
    throw new Error(error.message)
  }

  return file
}

export const createMultipleFiles = async (
  files: [File, TablesInsert<"files">][],
  targetCollectionID: string,
  workspace: Tables<"workspaces">,
  embeddingsProvider: "openai" | "local" | "colbert"
): Promise<string | undefined> => {
  let uploadedFileIDs = await Promise.all(
    files.map(async fileInfo => {
      let [file, fileRecord] = fileInfo
      let validFilename = fileRecord.name
        .replace(/[^a-z0-9.]/gi, "_")
        .toLowerCase()
      const extension = file.name.split(".").pop()
      const baseName = validFilename.substring(
        0,
        validFilename.lastIndexOf(".")
      )
      const maxBaseNameLength = 100 - (extension?.length || 0) - 1
      if (baseName.length > maxBaseNameLength) {
        fileRecord.name =
          baseName.substring(0, maxBaseNameLength) + "." + extension
      } else {
        fileRecord.name = baseName + "." + extension
      }
      const { data: createdFile, error } = await supabase
        .from("files")
        .insert([fileRecord])
        .select("*")
        .single()

      if (error) {
        throw new Error(error.message)
      }

      await createFileWorkspace({
        user_id: createdFile.user_id,
        file_id: createdFile.id,
        workspace_id: workspace.id
      })

      const filePath = await uploadFile(file, {
        name: createdFile.name,
        user_id: createdFile.user_id,
        file_id: createdFile.name
      })

      await updateFile(createdFile.id, {
        file_path: filePath
      })

      return createdFile.id
    })
  )

  const formData = new FormData()
  for (let uploadedFileID of uploadedFileIDs) {
    formData.append("file_ids", uploadedFileID)
  }
  formData.append("embeddingsProvider", embeddingsProvider)
  formData.append("targetCollectionID", targetCollectionID)
  formData.append("fileProcessor", workspace.file_processor)

  const response = await fetch("/api/retrieval/process/multiple", {
    method: "POST",
    body: formData
  })

  const jsonText = await response.text()
  const json = JSON.parse(jsonText)

  if (!response.ok) {
    console.error(
      `Error processing files(${uploadedFileIDs.length}):${uploadedFileIDs.join(", ")}, status:${response.status}, response:${json.message}`
    )
    toast.error("Failed to process file. Reason:" + json.message, {
      duration: 10000
    })
    await deleteMultipleFiles(uploadedFileIDs)
  }

  return json["multiple_file_queue_id"]
}

export const createFiles = async (
  files: TablesInsert<"files">[],
  workspace_id: string
) => {
  const { data: createdFiles, error } = await supabase
    .from("files")
    .insert(files)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  await createFileWorkspaces(
    createdFiles.map(file => ({
      user_id: file.user_id,
      file_id: file.id,
      workspace_id
    }))
  )

  return createdFiles
}

export const createFileWorkspace = async (item: {
  user_id: string
  file_id: string
  workspace_id: string
}) => {
  const { data: createdFileWorkspace, error } = await supabase
    .from("file_workspaces")
    .insert([item])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdFileWorkspace
}

export const createFileWorkspaces = async (
  items: { user_id: string; file_id: string; workspace_id: string }[]
) => {
  const { data: createdFileWorkspaces, error } = await supabase
    .from("file_workspaces")
    .insert(items)
    .select("*")

  if (error) throw new Error(error.message)

  return createdFileWorkspaces
}

export const updateFile = async (
  fileId: string,
  file: TablesUpdate<"files">
) => {
  const { data: updatedFile, error } = await supabase
    .from("files")
    .update(file)
    .eq("id", fileId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedFile
}

export const deleteFile = async (fileId: string) => {
  const { error } = await supabase.from("files").delete().eq("id", fileId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteMultipleFiles = async (fileIds: string[]) => {
  const { error } = await supabase.from("files").delete().in("id", fileIds)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteFileWorkspace = async (
  fileId: string,
  workspaceId: string
) => {
  const { error } = await supabase
    .from("file_workspaces")
    .delete()
    .eq("file_id", fileId)
    .eq("workspace_id", workspaceId)

  if (error) throw new Error(error.message)

  return true
}
