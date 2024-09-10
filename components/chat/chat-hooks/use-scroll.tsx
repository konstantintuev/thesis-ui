import {
  type UIEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react"
import { useStore } from "@/context/context"
import { useParams } from "next/navigation"

export const useScroll = () => {
  const { isGenerating, chatMessages, scrollHeight, setScrollHeight } =
    useStore()

  const params = useParams()

  const messagesStartRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollView = useRef<HTMLDivElement>(null)
  const isAutoScrolling = useRef(false)

  const [isAtTop, setIsAtTop] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [userScrolled, setUserScrolled] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    setUserScrolled(false)

    if (!isGenerating && userScrolled) {
      setUserScrolled(false)
    }
  }, [isGenerating])

  useEffect(() => {
    if (isGenerating && !userScrolled) {
      scrollToBottom()
    }
  }, [chatMessages])

  // Default next-js scroll restoration doesn't work with sub scroll views, so we implement it ourselves
  useEffect(() => {
    if (
      scrollHeight.scrollTop !== 0 &&
      scrollView.current &&
      scrollHeight.pageId === `${params.workspaceid}/${params.chatid}`
    ) {
      scrollView.current.scrollTop = scrollHeight.scrollTop
    }
  }, [])

  const handleScroll: UIEventHandler<HTMLDivElement> = useCallback(e => {
    const target = e.target as HTMLDivElement
    const bottom =
      Math.round(target.scrollHeight) - Math.round(target.scrollTop) ===
      Math.round(target.clientHeight)
    setIsAtBottom(bottom)

    const top = target.scrollTop === 0
    setIsAtTop(top)

    if (!bottom && !isAutoScrolling.current) {
      setUserScrolled(true)
    } else {
      setUserScrolled(false)
    }

    const isOverflow = target.scrollHeight > target.clientHeight
    setIsOverflowing(isOverflow)
    scrollHeight.scrollTop = target.scrollTop
    scrollHeight.pageId = `${params.workspaceid}/${params.chatid}`
  }, [])

  const scrollToTop = useCallback(() => {
    if (messagesStartRef.current) {
      messagesStartRef.current.scrollIntoView({ behavior: "instant" })
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    isAutoScrolling.current = true

    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "instant" })
      }

      isAutoScrolling.current = false
    }, 100)
  }, [])

  return {
    messagesStartRef,
    messagesEndRef,
    scrollView,
    isAtTop,
    isAtBottom,
    userScrolled,
    isOverflowing,
    handleScroll,
    scrollToTop,
    scrollToBottom,
    setIsAtBottom
  }
}
