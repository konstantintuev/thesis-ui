import React, { FC, useContext } from "react"
import type { IHighlight } from "./react-pdf-highlighter"
import { useParams } from "next/navigation"
import { ChatbotUIContext } from "@/context/context"
import { IconCheck, IconPlus, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { markIrrelevant, markRelevant } from "@/db/chat-files"

interface Props {
  documentName: string
  resetHighlights: () => void
  toggleDocument: () => void
  fileQuery: string
}

const updateHash = (highlight: IHighlight) => {
  document.location.hash = `highlight-${highlight.id}`
}

export const DocumentSidebar: FC<Props> = ({
  documentName,
  toggleDocument,
  resetHighlights,
  fileQuery
}) => {
  const params = useParams()
  const documentid = params.documentid as string
  const chatid = params.chatid as string
  const workspaceid = params.workspaceid as string

  const { chatFileHighlights, setChatFileHighlights } =
    useContext(ChatbotUIContext)
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
          <span className="font-semibold text-gray-800">{fileQuery}</span>
          <br />
          Do you find it relevant?
        </p>
        <div className="flex space-x-2">
          <button
            className="flex h-[36px] items-center justify-center rounded-md bg-blue-500 px-4 text-white transition-colors duration-150 hover:bg-blue-600"
            onClick={() => {
              void markRelevant(chatid, documentid)
            }}
          >
            <IconCheck className="mr-1" size={20} />
            Relevant
          </button>
          <button
            className="flex h-[36px] items-center justify-center rounded-md bg-red-500 px-4 text-white transition-colors duration-150 hover:bg-red-600"
            onClick={() => {
              void markIrrelevant(chatid, documentid)
            }}
          >
            <IconX className="mr-1" size={20} />
            Irrelevant
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
