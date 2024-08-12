import React, {
  Component,
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react"

import {
  AreaHighlight,
  Comment,
  Highlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
  Tip
} from "./react-pdf-highlighter"

import type {
  Content,
  IHighlight,
  NewHighlight,
  ScaledPosition
} from "./react-pdf-highlighter"

import { DocumentSidebar } from "./DocumentSidebar"
import { Spinner } from "./Spinner"
import { testHighlights as _testHighlights } from "./test-highlights"

import "./style/PDFHighlighter.css"
import { useParams } from "next/navigation"
import {
  getChatFilesByChatId,
  getHighlights,
  saveHighlights
} from "@/db/chat-files"
import { ChatbotUIContext } from "@/context/context"
import dynamic from "next/dynamic"
import { getFileFromStorage } from "@/db/storage/files"
import { getChatById } from "@/db/chats"
import { getMessagesByChatId } from "@/db/messages"

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights

interface State {
  url: string
  highlights: Array<IHighlight>
}

const getNextId = () => String(Math.random()).slice(2)

const parseIdFromHash = () => document.location.hash.slice("#highlight-".length)

const resetHash = () => {
  document.location.hash = ""
}

const HighlightPopup = ({
  comment
}: {
  comment: { text: string; emoji: string }
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji.length > 0
        ? `${comment.emoji} ${comment.text}`
        : comment.text}
    </div>
  ) : null

interface DocumentUIProps {}

export const DocumentUI: FC<DocumentUIProps> = ({}) => {
  const params = useParams()
  const documentid = params.documentid as string
  const chatid = params.chatid as string
  const workspaceid = params.workspaceid as string

  const { chatFileHighlights, setChatFileHighlights } =
    useContext(ChatbotUIContext)

  const [documentUrl, setDocumentUrl] = useState<string>("")
  const [documentName, setDocumentName] = useState<string>("")

  // Prevent closing the highlight comment input by other hint tooltips
  const editingCommentTooltipOpen = useMemo(() => {
    return {
      open: false
    }
  }, [])

  const resetHighlights = () => {
    setChatFileHighlights(prevState => {
      let ret = { ...prevState }
      ret[documentid] = []
      return ret
    })
  }

  const scrollViewerTo = useMemo(() => {
    return {
      scrollTo: (highlight: IHighlight) => {}
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const chatFiles = await getChatFilesByChatId(chatid)

      const fileRecord = chatFiles.chat_files.find(
        f => f.file?.id === documentid
      )?.file

      const chatMsges = await getMessagesByChatId(chatid)

      if (!fileRecord || !chatMsges) return

      const highlights = await getHighlights(chatid, documentid)

      const link = await getFileFromStorage(fileRecord.file_path)

      setDocumentUrl(link)

      setDocumentName(fileRecord.name)

      // Always create a new object so the state knows something changed
      setChatFileHighlights(highlightsAll => {
        let ret = { ...highlightsAll }
        ret[documentid] = highlights
        return ret
      })
    })()
  }, [chatid, documentid, setChatFileHighlights, workspaceid])

  const getHighlightById = useCallback(
    (id: string) => {
      return chatFileHighlights[documentid]?.find(
        highlight => highlight.id === id
      )
    },
    [chatFileHighlights, documentid]
  )

  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash())

    if (highlight) {
      scrollViewerTo.scrollTo(highlight)
    }
  }, [getHighlightById, scrollViewerTo])

  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false)
  }, [chatFileHighlights, scrollToHighlightFromHash])

  const addHighlight = (highlight: NewHighlight) => {
    console.log("Saving highlight", highlight)

    setChatFileHighlights(highlightsAll => {
      let ret = { ...highlightsAll }
      let thisDocHighlights = ret[documentid] ?? []
      ret[documentid] = [
        { ...highlight, id: getNextId() },
        ...thisDocHighlights
      ]
      void saveHighlights(chatid, documentid, ret[documentid])
      return ret
    })
  }

  const deleteHighlight = (highlightId: string) => {
    console.log("Deleting highlight", highlightId)

    setChatFileHighlights(highlightsAll => {
      let ret = { ...highlightsAll }
      ret[documentid] = ret[documentid].filter(
        highlight => highlight.id !== highlightId
      )
      void saveHighlights(chatid, documentid, ret[documentid])
      return ret
    })
  }

  const updateHighlight = (
    highlightId: string,
    position: Partial<ScaledPosition>,
    content: Partial<Content>,
    comment: Partial<Comment>
  ) => {
    console.log("Updating highlight", highlightId, position, content)

    setChatFileHighlights(highlightsAll => {
      let ret = { ...highlightsAll }
      ret[documentid] = ret[documentid]?.map(h => {
        const {
          id,
          position: originalPosition,
          content: originalContent,
          comment: originalComment,
          ...rest
        } = h
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              comment: { ...originalComment, ...comment },
              ...rest
            }
          : h
      })
      void saveHighlights(chatid, documentid, ret[documentid])
      return ret
    })
  }

  if (documentUrl.length === 0) {
    return <Spinner />
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <DocumentSidebar
        documentName={documentName}
        scrollViewerTo={scrollViewerTo}
      />
      <div
        style={{
          height: "100vh",
          width: "75%",
          position: "relative"
        }}
      >
        <PdfLoader url={documentUrl} beforeLoad={<Spinner />}>
          {pdfDocument => (
            <PdfHighlighter
              pdfScaleValue={"auto"}
              pdfDocument={pdfDocument}
              enableAreaSelection={event => event.altKey}
              onScrollChange={resetHash}
              // pdfScaleValue="page-width"
              scrollRef={scrollTo => {
                scrollViewerTo.scrollTo = scrollTo
                scrollToHighlightFromHash()
              }}
              onTipHide={() => (editingCommentTooltipOpen.open = false)}
              onSelectionFinished={(
                position,
                content,
                hideTipAndSelection,
                transformSelection
              ) => (
                <Tip
                  onOpen={() => {
                    editingCommentTooltipOpen.open = true
                    transformSelection()
                  }}
                  closeTip={hideTipAndSelection}
                  onConfirm={comment => {
                    addHighlight({ content, position, comment })

                    hideTipAndSelection()
                  }}
                />
              )}
              highlightTransform={(
                highlight,
                index,
                setTip,
                hideTip,
                viewportToScaled,
                screenshot,
                isScrolledTo
              ) => {
                const isTextHighlight = !highlight.content?.image

                const component = isTextHighlight ? (
                  <Highlight
                    isScrolledTo={isScrolledTo}
                    position={highlight.position}
                    comment={highlight.comment}
                    onClick={() => {
                      console.log("Highlight clicked:", highlight.content.text)
                      editingCommentTooltipOpen.open = true
                      setTip(highlight, highlight => (
                        <Tip
                          text={highlight?.comment?.text}
                          emoji={highlight?.comment?.emoji}
                          onOpen={() => {}}
                          onDeleteClick={() => {
                            deleteHighlight(highlight.id)

                            editingCommentTooltipOpen.open = false

                            hideTip()
                          }}
                          closeTip={hideTip}
                          compact={false}
                          onConfirm={comment => {
                            updateHighlight(highlight.id, {}, {}, comment)

                            hideTip()

                            editingCommentTooltipOpen.open = false
                          }}
                        />
                      ))
                    }}
                  />
                ) : (
                  <AreaHighlight
                    isScrolledTo={isScrolledTo}
                    highlight={highlight}
                    onChange={boundingRect => {
                      updateHighlight(
                        highlight.id,
                        { boundingRect: viewportToScaled(boundingRect) },
                        { image: screenshot(boundingRect) },
                        {}
                      )
                    }}
                    onClick={() => {
                      console.log(
                        "Area highlight clicked:",
                        highlight.content.text
                      )
                      editingCommentTooltipOpen.open = true
                      setTip(highlight, highlight => (
                        <Tip
                          text={highlight?.comment?.text}
                          emoji={highlight?.comment?.emoji}
                          onOpen={() => {}}
                          onDeleteClick={() => {
                            deleteHighlight(highlight.id)

                            editingCommentTooltipOpen.open = false

                            hideTip()
                          }}
                          closeTip={hideTip}
                          compact={false}
                          onConfirm={comment => {
                            updateHighlight(highlight.id, {}, {}, comment)

                            hideTip()

                            editingCommentTooltipOpen.open = false
                          }}
                        />
                      ))
                    }}
                  />
                )

                return (
                  <Popup
                    popupContent={<HighlightPopup {...highlight} />}
                    onMouseOver={popupContent =>
                      !editingCommentTooltipOpen.open &&
                      setTip(highlight, highlight => popupContent)
                    }
                    onMouseOut={() =>
                      !editingCommentTooltipOpen.open && hideTip()
                    }
                    key={index}
                  >
                    {component}
                  </Popup>
                )
              }}
              highlights={chatFileHighlights[documentid] ?? []}
            />
          )}
        </PdfLoader>
      </div>
    </div>
  )
}

export default DocumentUI
