import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext, useState } from "react"
import { Message } from "../messages/message"
import {
  IconFileFilled,
  IconFileTypeCsv,
  IconFileTypeDocx,
  IconFileTypePdf,
  IconFileTypeTxt,
  IconJson,
  IconMarkdown,
  IconX
} from "@tabler/icons-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface RetrieverMessageFileHeaderProps {
  fileName: string
  fileId: string
}

// TODO: add global state about relevant/irrelevant/not reviewed files
export const RetrieverMessageFileHeader: FC<
  RetrieverMessageFileHeaderProps
> = ({ fileName, fileId }) => {
  const { chatFiles } = useContext(ChatbotUIContext)

  const params = useParams()

  const fileInfo = chatFiles.find(it => it.id === fileId)

  if (!fileInfo) return undefined

  fileName = fileInfo.name

  let fileExtension = fileName.substring(fileName.lastIndexOf(".") + 1)

  return (
    <div>
      <Link
        href={`${params.chatid as string}/document/${fileId}`}
        className={`relative flex h-[64px] cursor-pointer items-center space-x-4 rounded-xl px-4 py-3 no-underline ${
          fileInfo.relevant === true
            ? "bg-green-600 text-white"
            : fileInfo.relevant === false
              ? "bg-red-600 text-white"
              : "border-2"
        } hover:opacity-50`}
      >
        <div className="rounded bg-blue-500 p-2">
          {(() => {
            switch (fileExtension) {
              case "pdf":
                return <IconFileTypePdf />
              case "markdown":
              case "md":
                return <IconMarkdown />
              case "txt":
                return <IconFileTypeTxt />
              case "json":
                return <IconJson />
              case "csv":
                return <IconFileTypeCsv />
              case "docx":
                return <IconFileTypeDocx />
              default:
                return <IconFileFilled />
            }
          })()}
        </div>

        <div className="truncate text-sm">
          <div className="truncate">{fileName}</div>
          <div className="text-xs">{`${fileExtension.toUpperCase()} · ${fileInfo.fileDate} · Author: ${fileInfo.authorName}`}</div>
        </div>
      </Link>
      <div />
    </div>
  )
}

export const jsonStringToRetrieverMessageFileHeader = (
  fileMetadata: string
) => {
  const parsedFileMetadata = JSON.parse(fileMetadata)
  return <RetrieverMessageFileHeader {...parsedFileMetadata} />
}
