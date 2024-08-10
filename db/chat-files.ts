import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert } from "@/supabase/types"
import { IHighlight } from "@/components/document/react-pdf-highlighter"

export const getChatFilesByChatId = async (chatId: string) => {
  const { data: chatFiles, error } = await supabase
    .from("chats")
    .select(
      `
      id, 
      name, 
      files (*),
      chat_files (*)
    `
    )
    .eq("id", chatId)
    .single()

  if (!chatFiles) {
    throw new Error(error.message)
  }

  return chatFiles
}

export const createChatFile = async (chatFile: TablesInsert<"chat_files">) => {
  const { data: createdChatFile, error } = await supabase
    .from("chat_files")
    .insert(chatFile)
    .select("*")

  if (!createdChatFile) {
    throw new Error(error.message)
  }

  return createdChatFile
}

export const createChatFiles = async (
  chatFiles: TablesInsert<"chat_files">[]
) => {
  const { data: createdChatFiles, error } = await supabase
    .from("chat_files")
    .insert(chatFiles)
    .select("*")

  if (!createdChatFiles) {
    throw new Error(error.message)
  }

  return createdChatFiles
}

export const saveHighlights = async (
  chatId: string,
  fileId: string,
  highlights: IHighlight[]
) => {
  const { data: updatedChatFiles, error } = await supabase
    .from("chat_files")
    .update({ highlights: highlights as any })
    .eq("chat_id", chatId)
    .eq("file_id", fileId)
    .select("*")
    .single()
  return updatedChatFiles
}

export const getHighlights = async (
  chatId: string,
  fileId: string
): Promise<IHighlight[]> => {
  const { data: updatedChatFiles, error } = await supabase
    .from("chat_files")
    .select("*")
    .eq("chat_id", chatId)
    .eq("file_id", fileId)
    .single()
  return (updatedChatFiles?.highlights ?? []) as any
}
