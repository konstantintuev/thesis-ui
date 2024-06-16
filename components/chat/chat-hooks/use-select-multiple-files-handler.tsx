import { ChatbotUIContext } from "@/context/context"
import { createDocXFile, createFile, createMultipleFiles } from "@/db/files"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import mammoth from "mammoth"
import { useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { TablesInsert } from "@/supabase/types"

export const ACCEPTED_FILE_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/json",
  "text/markdown",
  "application/pdf",
  "text/plain"
].join(",")

export const useSelectMultipleFilesHandler = () => {
  const {
    selectedWorkspace,
    profile,
    chatSettings,
    setNewMessageImages,
    setNewMessageFiles,
    setShowFilesDisplay,
    setFiles,
    setUseRetrieval
  } = useContext(ChatbotUIContext)

  const [filesToAccept, setFilesToAccept] = useState(ACCEPTED_FILE_TYPES)

  useEffect(() => {
    handleFilesToAccept()
  }, [chatSettings?.model])

  const handleFilesToAccept = () => {
    const model = chatSettings?.model
    const FULL_MODEL = LLM_LIST.find(llm => llm.modelId === model)

    if (!FULL_MODEL) return

    setFilesToAccept(
      FULL_MODEL.imageInput
        ? `${ACCEPTED_FILE_TYPES},image/*`
        : ACCEPTED_FILE_TYPES
    )
  }

  const handleSelectDeviceFiles = async (
    targetCollection: TablesInsert<"collections">,
    files: File[]
  ) => {
    if (!profile || !selectedWorkspace || !chatSettings) {
      console.log(
        `Upload file: failed ${!profile} ${!selectedWorkspace} ${!chatSettings}`
      )
      return
    }

    setShowFilesDisplay(true)
    setUseRetrieval(true)

    console.log(`Upload files: ${files.length}`)

    try {
      if (!files) {
        throw new Error("No files selected")
      }
      let badFileTypes: string[] = []
      files.forEach(file => {
        if (
          !(
            file.type.includes("image") ||
            ACCEPTED_FILE_TYPES.split(",").includes(file.type)
          )
        ) {
          badFileTypes.push(file.type)
        }
      })
      if (badFileTypes.length > 0) {
        throw new Error(`Unsupported file types: ${badFileTypes.join(", ")}`)
      }
      let upload_files = files.map(file => {
        let simplifiedFileType = file.type.split("/")[1]
        if (simplifiedFileType.includes("vnd.adobe.pdf")) {
          simplifiedFileType = "pdf"
        } else if (
          simplifiedFileType.includes(
            "vnd.openxmlformats-officedocument.wordprocessingml.document" ||
              "docx"
          )
        ) {
          simplifiedFileType = "docx"
        }
        return [
          file,
          {
            user_id: profile.user_id,
            description: "",
            file_path: "",
            name: file.name,
            size: file.size,
            tokens: 0,
            type: simplifiedFileType
          }
        ] as [File, TablesInsert<"files">]
      })
      const createdMultipleFiles = await createMultipleFiles(
        upload_files,
        targetCollection.id!,
        selectedWorkspace.id,
        chatSettings.embeddingsProvider
      )

      if (createdMultipleFiles) {
        toast.success(
          `Created a request to add ${files.length} files to collection ${targetCollection.name} with processing id ${createdMultipleFiles}!`,
          {
            duration: 10_000
          }
        )
      }
    } catch (error: any) {
      toast.error("Failed to upload. " + error?.message, {
        duration: 1_0000
      })
    }
  }

  return {
    handleSelectDeviceFiles,
    filesToAccept
  }
}
