import React, { FC, useEffect } from "react"
import { useStore } from "@/context/context"
import type { IHighlight } from "./react-pdf-highlighter"
import { useParams } from "next/navigation"
import {
  IconCheck,
  IconPlus,
  IconX,
  IconStar,
  IconStarFilled
} from "@tabler/icons-react"
import {
  createChatFilesState,
  getChatFilesByChatId,
  markIrrelevant,
  markRelevant
} from "@/db/chat-files"
import { Spinner } from "@/components/document/Spinner"
import "./style/PDFHighlighter.css"
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections"

interface Props {
  documentName: string
  scrollViewerTo?: { scrollTo: (highlight: IHighlight) => void }
}

const updateHash = (highlight: IHighlight) => {
  document.location.hash = `highlight-${highlight.id}`
}

export const DocumentSidebar: FC<Props> = ({
  documentName,
  scrollViewerTo
}) => {
  const params = useParams()
  const documentid = params.documentid as string
  const chatid = params.chatid as string
  const workspaceid = params.workspaceid as string

  const { chatFileHighlights, setChatFiles, chatFiles, setCollections } =
    useStore()

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
      // Marking file relevant/irrelevant changes the corresponding retrieval chat collection
      const collectionData =
        await getCollectionWorkspacesByWorkspaceId(workspaceid)
      setCollections(collectionData ?? [])
    }
  }

  const handleIrrelevantClick = async () => {
    // Irrelevant if not (relevant or true) -> not relevant or false
    const ok = await markIrrelevant(chatid, documentid, !(isRelevant ?? true))
    if (ok) {
      const chatFiles = await getChatFilesByChatId(chatid)
      setChatFiles(createChatFilesState(chatFiles))
      // Marking file relevant/irrelevant changes the corresponding retrieval chat collection
      const collectionData =
        await getCollectionWorkspacesByWorkspaceId(workspaceid)
      setCollections(collectionData ?? [])
    }
  }

  const documentIsInQueries = chatFile?.queryRelatedMetadata ?? []

  return (
    <div
      className={
        "document-sidebar dark:document-sidebar-dark overflow-auto text-gray-500 dark:text-gray-50"
      }
      style={{ width: "25vw" }}
    >
      <div className="px-4 pt-4">
        <h2 className="mb-4">{documentName}</h2>

        <p>
          <small>
            To create area highlight hold ⌥ Option key (Alt), then click and
            drag.
          </small>
        </p>
      </div>

      <div className="px-4 pt-4">
        <p className="mb-4 text-sm">
          Given the general theme of the file retrieval task:
          <br />
          <span className="font-bold">NONE_SO_FAR_PART_OF_QUERY_REWRITING</span>
          <br />
          The file was retrieved based on the following queries, each with an
          associated relevance score:
        </p>

        <div className="mb-4">
          {documentIsInQueries.map((query, index) => (
            <div
              key={index}
              className={`mb-3 border border-gray-300 p-3 dark:border-gray-600 ${
                index === 0
                  ? "border-l-4 border-blue-600 bg-gray-50 dark:border-blue-400 dark:bg-gray-800"
                  : "bg-white dark:bg-gray-900"
              }`}
            >
              {index === 0 && (
                <div className="mb-2 flex items-center">
                  <span className="pr-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                    Primary Query
                  </span>
                  <IconStarFilled className="-mt-1 size-4 text-blue-700 dark:text-blue-400" />
                </div>
              )}
              <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                <strong>Query {index + 1}:</strong> {query.file_query}
              </p>
              <p className="mb-1 text-sm text-gray-800 dark:text-gray-300">
                <strong>Relevance Score:</strong>{" "}
                {(query.metadata.score * 100).toFixed(1)}%
              </p>
            </div>
          ))}

          <div className="flex space-x-2">
            <button
              className={`flex items-center justify-center truncate rounded-md transition-all duration-300 ${
                isRelevant === null
                  ? "h-[36px] w-1/2 bg-green-500 px-4 text-white hover:bg-green-300"
                  : isRelevant === true
                    ? "h-[36px] w-2/3 bg-green-500 px-4 text-white hover:bg-green-300"
                    : "h-[36px] w-1/3 bg-green-500 text-white hover:bg-green-300"
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
              className={`flex items-center justify-center truncate rounded-md transition-all duration-300 ${
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

        <ul className="max-w-md list-inside list-none space-y-1">
          {chatFileHighlights[documentid]?.map((highlight, index) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: This is an example app
              key={index}
              className="duration-140 cursor-pointer border-b border-gray-500 p-4 transition ease-in hover:bg-gray-600/10 rtl:space-x-reverse"
              onClick={() => {
                // updateHash(highlight)
                if (highlight) {
                  scrollViewerTo?.scrollTo(highlight)
                }
              }}
            >
              <div>
                <strong>
                  {highlight.comment.author.name}: {highlight.comment.text}
                </strong>
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

              <div className="highlight__footer relative">
                <div className="absolute left-0">
                  {highlight.comment.editedTime}
                </div>
                <div className="absolute right-0">
                  Page {highlight.position.pageNumber}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
