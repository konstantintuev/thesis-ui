import React, {
  Component,
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react"

import { AreaHighlight, Highlight, Popup, Tip } from "./react-pdf-highlighter"

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
import { getChatFilesByChatId } from "@/db/chat-files"
import { ChatbotUIContext } from "@/context/context"
import dynamic from "next/dynamic"
import { getFileFromStorage } from "@/db/storage/files"

const PdfLoader = dynamic(
  () => import("./react-pdf-highlighter/components/PdfLoader"),
  { ssr: false }
)
const PdfHighlighter = dynamic(
  () => import("./react-pdf-highlighter/components/PdfHighlighter"),
  { ssr: false }
)

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
      {comment.emoji} {comment.text}
    </div>
  ) : null

const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021"
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480"
interface DocumentUIProps {}

export const DocumentUI: FC<DocumentUIProps> = ({}) => {
  const params = useParams()
  const documentid = params.documentid as string

  const { chatFileHighlights, setChatFileHighlights } =
    useContext(ChatbotUIContext)

  const [documentUrl, setDocumentUrl] = useState<string>("")

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
      const chatFiles = await getChatFilesByChatId(params.chatid as string)
      console.log(chatFiles)
      const fileRecord = chatFiles.files.find(f => f.id === documentid)

      if (!fileRecord) return

      const link = await getFileFromStorage(fileRecord.file_path)

      setDocumentUrl(link)
    })()
  }, [documentid, params.chatid])

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
      return ret
    })
  }

  const updateHighlight = (
    highlightId: string,
    position: Partial<ScaledPosition>,
    content: Partial<Content>
  ) => {
    console.log("Updating highlight", highlightId, position, content)

    setChatFileHighlights(highlightsAll => {
      let ret = { ...highlightsAll }
      ret[documentid] = ret[documentid]?.map(h => {
        const {
          id,
          position: originalPosition,
          content: originalContent,
          ...rest
        } = h
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              ...rest
            }
          : h
      })
      return ret
    })
  }

  if (documentUrl.length === 0) {
    return <Spinner />
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <DocumentSidebar
        resetHighlights={resetHighlights}
        toggleDocument={() => {}}
      />
      <div
        style={{
          height: "100vh",
          width: "75%",
          position: "relative"
        }}
      >
        <PdfLoader
          url={documentUrl}
          beforeLoad={<Spinner />}
          workerSrc={
            "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs"
          }
        >
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
              onSelectionFinished={(
                position,
                content,
                hideTipAndSelection,
                transformSelection
              ) => (
                <Tip
                  onOpen={transformSelection}
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
                      console.log(
                        "Highlight clicked:",
                        highlight,
                        index,
                        setTip,
                        hideTip,
                        viewportToScaled,
                        screenshot,
                        isScrolledTo
                      )
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
                        { image: screenshot(boundingRect) }
                      )
                    }}
                  />
                )

                return (
                  <Popup
                    popupContent={<HighlightPopup {...highlight} />}
                    onMouseOver={popupContent =>
                      setTip(highlight, highlight => popupContent)
                    }
                    onMouseOut={hideTip}
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
