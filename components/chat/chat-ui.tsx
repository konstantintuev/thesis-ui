import Loading from "@/app/[locale]/loading"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { createChatFilesState, getChatFilesByChatId } from "@/db/chat-files"
import { getChatById } from "@/db/chats"
import { getMessageFileItemsByMessageId } from "@/db/message-file-items"
import { getMessagesByChatId } from "@/db/messages"
import { getMessageImageFromStorage } from "@/db/storage/message-images"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import useHotkey from "@/lib/hooks/use-hotkey"
import { isModelIdFileRetriever, LLMID, MessageImage } from "@/types"
import { useParams } from "next/navigation"
import { FC, useEffect, useRef, useState } from "react"
import { useMessageStore, useStore } from "@/context/context"
import { ChatHelp } from "./chat-help"
import { useScroll } from "./chat-hooks/use-scroll"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { ChatScrollButtons } from "./chat-scroll-buttons"
import { ChatSecondaryButtons } from "./chat-secondary-buttons"
import {
  getChatCollectionConsumer,
  getChatCollectionCreatorByCollection
} from "@/db/collections"
import { getPublicProfileByUserId } from "@/db/profile"

interface ChatUIProps {}

export const ChatUI: FC<ChatUIProps> = ({}) => {
  useHotkey("o", () => handleNewChat())

  const params = useParams()

  const {
    selectedChat,
    setSelectedChat,
    setChatSettings,
    setChatImages,
    assistants,
    setSelectedAssistant,
    setChatFileItems,
    setChatFiles,
    setShowFilesDisplay,
    setUseRetrieval,
    setSelectedTools,
    setCollectionRetrievalActive,
    setCollectionCreatorChat,
    setSelectedCollectionCreatorChat,
    chatSettings
  } = useStore()

  const { chatMessages, setChatMessages } = useMessageStore()

  const { handleNewChat, handleFocusChatInput } = useChatHandler()

  const {
    messagesStartRef,
    messagesEndRef,
    scrollView,
    handleScroll,
    scrollToBottom,
    setIsAtBottom,
    isAtTop,
    isAtBottom,
    isOverflowing,
    scrollToTop
  } = useScroll()

  // First check the url and then the selected chat, as otherwise chats never get updated
  //   as noNeedToUpdateData is activated!
  const chatID = (params.chatid as string) ?? selectedChat?.id

  const noNeedToUpdateData =
    chatMessages.length > 0 && chatMessages[0].message.chat_id === chatID
  const [loading, setLoading] = useState(false)

  const initialFetchState = useRef<{
    loaded?: string
    fetching?: string
  }>({})

  useEffect(() => {
    if (noNeedToUpdateData) {
      chatMessages
      chatSettings
      return
    }

    // New chats have undefined chatID -> don't need to be fetched
    if (
      initialFetchState.current.loaded === chatID ||
      initialFetchState.current.fetching === chatID
    ) {
      return
    }
    setLoading(true)
    initialFetchState.current.loaded = undefined
    initialFetchState.current.fetching = chatID

    const fetchData = async (chatID: string) => {
      /* The biggest problem with async fetching on start is that
      async functions are stateless, they don't know if the state has changed and therefore
      if they affect the state, they do it based on outdated information
      (e.g. the chat has changed, but just now we got the fetch for an older chat ->
        we just f-ed up the state and the chat hasn't changed correctly)
      The old functions used to set state after each fetch, which made very little sense ->
        computationally more demanding as we are building the state for a single
        cohesive UI - chat
      */
      let messagesFetched = await fetchMessages(chatID)
      if (chatID !== (params.chatid ?? useStore.getState().selectedChat?.id)) {
        // Outdated chat fetch
        return
      }
      let chatFetched = await fetchChat(chatID)
      if (
        !chatFetched ||
        chatID !== (params.chatid ?? useStore.getState().selectedChat?.id)
      ) {
        // Outdated chat fetch
        return
      }

      setChatImages(messagesFetched.images)
      setChatFileItems(messagesFetched.uniqueFileItems ?? [])
      setChatFiles(
        messagesFetched.chatFiles
          ? createChatFilesState(messagesFetched.chatFiles)
          : []
      )
      setShowFilesDisplay(messagesFetched.filesDisplay)
      setChatMessages(messagesFetched.fetchedChatMessages)

      setSelectedChat(chatFetched.selectedChat)
      setChatSettings(chatFetched.chatSettings)
      setUseRetrieval(chatFetched.useRetrieval)
      setSelectedAssistant(chatFetched.selectedAssistant)
      setSelectedTools(chatFetched.selectedTools)
      setSelectedCollectionCreatorChat(
        chatFetched.selectedCollectionCreatorChat
      )
      setCollectionRetrievalActive(chatFetched.collectionRetrievalActive)
      setCollectionCreatorChat(chatFetched.collectionCreatorChat)

      scrollToBottom()
      setIsAtBottom(true)
    }

    if (chatID) {
      fetchData(chatID).then(() => {
        handleFocusChatInput()
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
    initialFetchState.current.loaded = chatID
    initialFetchState.current.fetching = undefined
  }, [chatSettings])

  const fetchMessages = async (chatID: string) => {
    const fetchedMessages = await getMessagesByChatId(chatID)
    let chatFiles = null
    let uniqueFileItems = null
    let images: MessageImage[] = []
    let messageFileItems: any[] = []
    let filesDisplay = false

    const imagePromises: Promise<MessageImage>[] = fetchedMessages.flatMap(
      message =>
        message.image_paths
          ? message.image_paths.map(async imagePath => {
              const url = await getMessageImageFromStorage(imagePath)

              if (url) {
                const response = await fetch(url)
                const blob = await response.blob()
                const base64 = await convertBlobToBase64(blob)

                return {
                  messageId: message.id,
                  path: imagePath,
                  base64,
                  url,
                  file: null
                }
              }

              return {
                messageId: message.id,
                path: imagePath,
                base64: "",
                url,
                file: null
              }
            })
          : []
    )

    images = await Promise.all(imagePromises.flat())

    const messageFileItemPromises = fetchedMessages.map(
      async message => await getMessageFileItemsByMessageId(message.id)
    )

    messageFileItems = await Promise.all(messageFileItemPromises)

    //TODO: add attachable content to source to replace UUIDs -> add RLS for attachable content
    uniqueFileItems = messageFileItems.flatMap(item => item.file_items)

    chatFiles = await getChatFilesByChatId(chatID as string)

    filesDisplay = isModelIdFileRetriever(chatSettings?.model)

    const fetchedChatMessages = await Promise.all(
      fetchedMessages.map(async message => {
        const profile = await getPublicProfileByUserId(message.user_id)
        return {
          message,
          profile: profile,
          fileItems: messageFileItems
            .filter(messageFileItem => messageFileItem.id === message.id)
            .flatMap(messageFileItem =>
              messageFileItem.file_items.map((fileItem: any) => fileItem.id)
            )
        }
      })
    )

    return {
      images,
      uniqueFileItems,
      chatFiles,
      filesDisplay,
      fetchedChatMessages
    }
  }

  const fetchChat = async (chatID: string) => {
    const chat = await getChatById(chatID)
    if (!chat) return

    let selectedAssistant: any,
      selectedTools: any = [],
      collectionRetrievalActive: any,
      collectionCreatorChat: any

    if (chat.assistant_id) {
      const assistant = assistants.find(
        assistant => assistant.id === chat.assistant_id
      )

      if (assistant) {
        selectedAssistant = assistant

        selectedTools = (await getAssistantToolsByAssistantId(assistant.id))
          .tools
      }
    }

    let chatCollectionConsumer = await getChatCollectionConsumer(chat.id)
    if (chatCollectionConsumer) {
      collectionRetrievalActive = true
      let chatCollectionCreator = await getChatCollectionCreatorByCollection(
        chatCollectionConsumer.collection_id
      )
      if (chatCollectionCreator) {
        collectionCreatorChat = await getChatById(chatCollectionCreator.chat_id)
      }
    } else {
      collectionRetrievalActive = false
      collectionCreatorChat = null
    }

    return {
      chat,
      chatSettings: {
        model: chat.model as LLMID,
        prompt: chat.prompt,
        temperature: chat.temperature,
        contextLength: chat.context_length,
        includeProfileContext: chat.include_profile_context,
        includeWorkspaceInstructions: chat.include_workspace_instructions,
        embeddingsProvider: chat.embeddings_provider as
          | "openai"
          | "local"
          | "colbert"
      },
      selectedChat: chat,
      useRetrieval: chat.model !== "file_retriever",
      selectedAssistant,
      selectedTools,
      selectedCollectionCreatorChat: null,
      collectionRetrievalActive,
      collectionCreatorChat
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="relative flex h-full flex-col items-center">
      <div className="absolute left-4 top-2.5 flex justify-center">
        <ChatScrollButtons
          isAtTop={isAtTop}
          isAtBottom={isAtBottom}
          isOverflowing={isOverflowing}
          scrollToTop={scrollToTop}
          scrollToBottom={scrollToBottom}
        />
      </div>

      <div className="absolute right-4 top-1 flex h-[40px] items-center space-x-2">
        <ChatSecondaryButtons />
      </div>

      <div className="bg-secondary flex max-h-[50px] min-h-[50px] w-full items-center justify-center border-b-2 font-bold">
        <div className="max-w-[200px] truncate sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px] xl:max-w-[700px]">
          {selectedChat?.name || "Chat"}
        </div>
      </div>

      <div
        ref={scrollView}
        className="flex size-full flex-col overflow-auto border-b"
        onScroll={handleScroll}
      >
        <div ref={messagesStartRef} />

        <ChatMessages />

        <div ref={messagesEndRef} />
      </div>

      <div className="relative w-full min-w-[300px] items-end px-2 pb-3 pt-0 sm:w-[600px] sm:pb-8 sm:pt-5 md:w-[700px] lg:w-[700px] xl:w-[800px]">
        <ChatInput />
      </div>

      <div className="absolute bottom-2 right-2 hidden md:block lg:bottom-4 lg:right-4">
        <ChatHelp />
      </div>
    </div>
  )
}
