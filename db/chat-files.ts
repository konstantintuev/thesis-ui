import { supabase } from "@/lib/supabase/browser-client"
import { Tables, TablesInsert } from "@/supabase/types"
import { IHighlight } from "@/components/document/react-pdf-highlighter"
import { ChatFile } from "@/types"
import { format } from "date-fns"

type ChatFileWithFile = Tables<"chat_files"> & {
  file: Tables<"files"> | null
}

type ChatAndFiles = Pick<Tables<"chats">, "id" | "name"> & {
  chat_files: ChatFileWithFile[]
}

export const getChatFilesByChatId = async (
  chatId: string
): Promise<ChatAndFiles> => {
  const { data: chatFiles, error } = await supabase
    .from("chats")
    .select(
      `
      id, 
      name, 
      chat_files (
        *,
        file: files (*)
      )
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

// If already relevant, remove marker
export const markRelevant = async (
  chatId: string,
  fileId: string,
  isRelevant: boolean
): Promise<boolean> => {
  const { error } = await supabase
    .from("chat_files")
    .update({ relevant: isRelevant ? null : true })
    .eq("chat_id", chatId)
    .eq("file_id", fileId)
  return !error
}

export const markIrrelevant = async (
  chatId: string,
  fileId: string,
  isIrrelevant: boolean
): Promise<boolean> => {
  const { error } = await supabase
    .from("chat_files")
    .update({ relevant: isIrrelevant ? null : false })
    .eq("chat_id", chatId)
    .eq("file_id", fileId)
  return !error
}

export const createChatFilesState = (
  chatAndFiles: ChatAndFiles
): ChatFile[] => {
  return chatAndFiles.chat_files.map((chat_file, index) => ({
    id: chat_file.file?.id ?? "",
    name: chat_file.file?.name ?? "",
    type: chat_file.file?.type ?? "",
    file: null,
    relevant: chat_file.relevant,
    fileDate: chat_file.file?.created_at
      ? format(new Date(chat_file.file?.created_at), "dd.MM.yy")
      : undefined,
    // @ts-ignore
    authorName: chat_file.file?.metadata?.["author"]
  }))
}
