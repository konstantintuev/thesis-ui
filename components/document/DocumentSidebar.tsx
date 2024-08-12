import React, { FC, useContext, useEffect } from "react"
import type { IHighlight } from "./react-pdf-highlighter"
import { useParams } from "next/navigation"
import { ChatbotUIContext } from "@/context/context"
import { IconCheck, IconPlus, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  createChatFilesState,
  getChatFilesByChatId,
  markIrrelevant,
  markRelevant
} from "@/db/chat-files"
import { Spinner } from "@/components/document/Spinner"

interface Props {
  documentName: string
  resetHighlights: () => void
  toggleDocument: () => void
}

const updateHash = (highlight: IHighlight) => {
  document.location.hash = `highlight-${highlight.id}`
}

export const DocumentSidebar: FC<Props> = ({
  documentName,
  toggleDocument,
  resetHighlights
}) => {
  const params = useParams()
  const documentid = params.documentid as string
  const chatid = params.chatid as string
  const workspaceid = params.workspaceid as string

  const { chatFileHighlights, setChatFiles, chatFiles } =
    useContext(ChatbotUIContext)

  useEffect(() => {
    ;(async function () {
      if (chatFiles.length === 0) {
        const chatFiles = await getChatFilesByChatId(chatid)
        setChatFiles(createChatFilesState(chatFiles))
      }
    })()
  }, [chatid, setChatFiles])

  const chatFile = chatFiles.find(f => f.id === documentid)
  if (!chatFile) return <Spinner />

  const isRelevant = chatFile.relevant

  const handleRelevantClick = async () => {
    const ok = await markRelevant(chatid, documentid, isRelevant ?? false)
    if (ok) {
      const chatFiles = await getChatFilesByChatId(chatid)
      setChatFiles(createChatFilesState(chatFiles))
    }
  }

  const handleIrrelevantClick = async () => {
    // Irrelevant if not (relevant or true) -> not relevant or false
    const ok = await markIrrelevant(chatid, documentid, !(isRelevant ?? true))
    if (ok) {
      const chatFiles = await getChatFilesByChatId(chatid)
      setChatFiles(createChatFilesState(chatFiles))
    }
  }

  const documentIsInQueries = chatFile?.queryRelatedMetadata ?? []

  return (
    <div className="document_sidebar" style={{ width: "25vw" }}>
      <div className="description px-4 pt-4">
        <h2 className="mb-4">{documentName}</h2>

        <p>
          <small>
            To create area highlight hold ⌥ Option key (Alt), then click and
            drag.
          </small>
        </p>
      </div>

      <div className="p-4">
        <p className="mb-4 text-sm text-gray-700">
          Given the following general theme of the file retrieval task:
          <br />
          <span className="font-bold text-gray-900">
            NONE_SO_FAR_PART_OF_QUERY_REWRITING
          </span>
          <br />
          And given the retrieval query for this file:
          <br />
          <span className="font-semibold text-gray-800">
            {documentIsInQueries[0].file_query}
          </span>
          <br />
          Do you find it relevant?
        </p>
        <div className="flex space-x-2">
          <button
            className={`flex items-center justify-center rounded-md transition-all duration-300 ${
              isRelevant === null
                ? "h-[36px] w-1/2 bg-blue-500 px-4 text-white hover:bg-blue-300"
                : isRelevant === true
                  ? "h-[36px] w-2/3 bg-blue-500 px-4 text-white hover:bg-blue-300"
                  : "h-[36px] w-1/3 bg-blue-500 text-white hover:bg-blue-300"
            }`}
            onClick={handleRelevantClick}
          >
            {isRelevant === null || isRelevant === true ? (
              <>
                <IconCheck className="mr-2" size={20} />
                {isRelevant === null ? "Relevant" : "Marked Relevant"}
              </>
            ) : (
              <IconCheck size={20} />
            )}
          </button>

          <button
            className={`flex items-center justify-center rounded-md transition-all duration-300 ${
              isRelevant === null
                ? "h-[36px] w-1/2 bg-red-500 px-4 text-white hover:bg-red-300"
                : isRelevant === false
                  ? "h-[36px] w-2/3 bg-red-500 px-4 text-white hover:bg-red-300"
                  : "h-[36px] w-1/3 bg-red-500 text-white hover:bg-red-300"
            }`}
            onClick={handleIrrelevantClick}
          >
            {isRelevant === null || isRelevant === false ? (
              <>
                <IconX className="mr-2" size={20} />
                {isRelevant === null ? "Irrelevant" : "Marked Irrelevant"}
              </>
            ) : (
              <IconX size={20} />
            )}
          </button>
        </div>
      </div>

      <ul className="document_sidebar__highlights">
        {chatFileHighlights[documentid]?.map((highlight, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: This is an example app
            key={index}
            className="document_sidebar__highlight"
            onClick={() => {
              updateHash(highlight)
            }}
          >
            <div>
              <strong>{highlight.comment.text}</strong>
              {highlight.content.text ? (
                <blockquote style={{ marginTop: "0.5rem" }}>
                  {`${highlight.content.text.slice(0, 90).trim()}…`}
                </blockquote>
              ) : null}
              {highlight.content.image ? (
                <div
                  className="highlight__image"
                  style={{ marginTop: "0.5rem" }}
                >
                  <img src={highlight.content.image} alt={"Screenshot"} />
                </div>
              ) : null}
            </div>
            <div className="highlight__location">
              Page {highlight.position.pageNumber}
            </div>
          </li>
        ))}
      </ul>
      <div style={{ padding: "1rem" }}>
        <button type="button" onClick={toggleDocument}>
          Toggle PDF document
        </button>
      </div>
      {chatFileHighlights[documentid]?.length > 0 ? (
        <div style={{ padding: "1rem" }}>
          <button type="button" onClick={resetHighlights}>
            Reset highlights
          </button>
        </div>
      ) : null}
    </div>
  )
}
