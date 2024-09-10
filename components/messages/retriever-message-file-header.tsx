import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { Tables } from "@/supabase/types"
import { FC } from "react"
import { useStore } from "@/context/context"
import { Message } from "../messages/message"
import {
  IconCircleFilled,
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
import { cn } from "@/lib/utils"
import { WithTooltip } from "@/components/ui/with-tooltip"

interface RetrieverMessageFileHeaderProps {
  fileName: string
  fileId: string
  duplicateReference?: boolean | null
}

export const RetrieverMessageFileHeader: FC<
  RetrieverMessageFileHeaderProps
> = ({ fileName, fileId, duplicateReference }) => {
  const { isGenerating, chatFiles, selectedChat, selectedWorkspace } =
    useStore()

  const params = useParams()

  const fileInfo = chatFiles.find(it => it.id === fileId)

  if (!fileInfo) return undefined

  fileName = fileInfo.name
  const chatId = selectedChat?.id ?? (params.chatid as string)

  let fileExtension = fileName.substring(fileName.lastIndexOf(".") + 1)

  return (
    <div>
      <Link
        id={!duplicateReference ? fileId : undefined}
        href={
          !isGenerating
            ? `/${selectedWorkspace!.id}/chat/${chatId}/document/${fileId}`
            : ""
        }
        onClick={e => {
          if (isGenerating) {
            e.preventDefault()
          }
        }}
        className={`relative flex h-[64px] cursor-pointer items-center space-x-4 rounded-xl px-4 py-3 no-underline ${
          fileInfo.relevant === true
            ? "bg-green-600 text-white"
            : fileInfo.relevant === false
              ? "bg-red-600 text-white"
              : "border-2 hover:border-opacity-50 border-gray-200 " +
                "hover:dark:border-opacity-50 dark:border-gray-500"
        } hover:bg-opacity-50`}
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
          <div className="truncate">
            {duplicateReference && (
              <WithTooltip
                delayDuration={0}
                side="top"
                display={<div>This file is linked from a previous query</div>}
                trigger={
                  <span className="mb-1 mr-1.5 inline-block rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-medium text-yellow-800">
                    Referenced
                  </span>
                }
              />
            )}
            {fileName}
          </div>
          {
            <div className="text-xs">{`${fileExtension.toUpperCase()} · ${fileInfo.fileDate} · Author: ${fileInfo.authorName}`}</div>
          }
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
