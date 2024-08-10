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

interface RetrieverMessageFileHeaderProps {
  fileName: string
}

export const RetrieverMessageFileHeader: FC<
  RetrieverMessageFileHeaderProps
> = ({ fileName }) => {
  return (
    <div>
      <div
        className="relative flex h-[64px] cursor-pointer items-center space-x-4 rounded-xl border-2 px-4 py-3 hover:opacity-50"
        onClick={() => {}}
      >
        <div className="rounded bg-blue-500 p-2">
          {(() => {
            let fileExtension = fileName.includes("/")
              ? fileName.split("/")[1]
              : fileName

            switch (fileExtension) {
              case "pdf":
                return <IconFileTypePdf />
              case "markdown":
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
        </div>
      </div>
    </div>
  )
}

export const jsonStringToRetrieverMessageFileHeader = (
  fileMetadata: string
) => {
  const parsedFileMetadata = JSON.parse(fileMetadata)
  return <RetrieverMessageFileHeader {...parsedFileMetadata} />
}
