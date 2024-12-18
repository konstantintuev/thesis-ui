import { getAssistantCollectionsByAssistantId } from "@/db/assistant-collections"
import { getAssistantFilesByAssistantId } from "@/db/assistant-files"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { getChatById, updateChat } from "@/db/chats"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { deleteMessagesIncludingAndAfter } from "@/db/messages"
import { buildFinalMessages } from "@/lib/build-prompt"
import { Tables } from "@/supabase/types"
import {
  ChatMessage,
  ChatPayload,
  ChatSettings,
  isModelIdFileRetriever,
  LLMID,
  ModelProvider
} from "@/types"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { useMessageStore, useStore } from "@/context/context"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import {
  createTempMessages,
  handleCreateChat,
  handleCreateMessages,
  handleHostedChat,
  handleLocalChat,
  handleRetrieval,
  handleRewriteQueryClient,
  processResponse,
  validateChatSettings
} from "../chat-helpers"
import {
  createChatCollectionConsumer,
  getChatCollectionCreator
} from "@/db/collections"
import { toast } from "sonner"
import { deleteChatFilesIncludingAndAfter } from "@/db/chat-files"

export const useChatHandler = () => {
  const router = useRouter()

  const {
    userInput,
    chatFiles,
    setUserInput,
    setNewMessageImages,
    profile,
    setIsGenerating,
    setFirstTokenReceived,
    selectedChat,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    setSelectedTools,
    availableLocalModels,
    availableOpenRouterModels,
    abortController,
    setAbortController,
    chatSettings,
    newMessageImages,
    selectedAssistant,
    chatImages,
    setChatImages,
    setChatFiles,
    setCollections,
    setNewMessageFiles,
    setShowFilesDisplay,
    setCollectionRetrievalActive,
    setUseRetrieval,
    newMessageFiles,
    chatFileItems,
    setChatFileItems,
    setToolInUse,
    useRetrieval,
    sourceCount,
    setIsPromptPickerOpen,
    setIsFilePickerOpen,
    selectedTools,
    selectedPreset,
    setChatSettings,
    models,
    isPromptPickerOpen,
    isFilePickerOpen,
    isToolPickerOpen,
    selectedCollectionCreatorChat,
    collectionRetrievalActive,
    setSelectedCollectionCreatorChat,
    setCollectionCreatorChat,
    workspaces
  } = useStore()

  const { chatMessages, setChatMessages } = useMessageStore()

  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isPromptPickerOpen || !isFilePickerOpen || !isToolPickerOpen) {
      chatInputRef.current?.focus()
    }
  }, [isPromptPickerOpen, isFilePickerOpen, isToolPickerOpen])

  const handleNewChat = async (chatSettingsToUse?: any) => {
    if (!selectedWorkspace) return

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)
    setChatFileItems([])

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
    setIsPromptPickerOpen(false)
    setIsFilePickerOpen(false)
    setCollectionRetrievalActive(false)
    setCollectionCreatorChat(null)
    setSelectedCollectionCreatorChat(null)

    setSelectedTools([])
    setToolInUse("none")

    if (selectedAssistant) {
      setChatSettings({
        model: selectedAssistant.model as LLMID,
        prompt: selectedAssistant.prompt,
        temperature: selectedAssistant.temperature,
        contextLength: selectedAssistant.context_length,
        includeProfileContext: selectedAssistant.include_profile_context,
        includeWorkspaceInstructions:
          selectedAssistant.include_workspace_instructions,
        embeddingsProvider: selectedAssistant.embeddings_provider as
          | "openai"
          | "local"
          | "colbert"
      })

      let allFiles = []

      const assistantFiles = (
        await getAssistantFilesByAssistantId(selectedAssistant.id)
      ).files
      allFiles = [...assistantFiles]
      const assistantCollections = (
        await getAssistantCollectionsByAssistantId(selectedAssistant.id)
      ).collections
      for (const collection of assistantCollections) {
        const collectionFiles = (
          await getCollectionFilesByCollectionId(collection.id)
        ).files
        allFiles = [...allFiles, ...collectionFiles]
      }
      const assistantTools = (
        await getAssistantToolsByAssistantId(selectedAssistant.id)
      ).tools

      setSelectedTools(assistantTools)
      setChatFiles(
        allFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          file: null
        }))
      )

      if (allFiles.length > 0) setShowFilesDisplay(true)
    } else if (selectedPreset) {
      setChatSettings({
        model: selectedPreset.model as LLMID,
        prompt: selectedPreset.prompt,
        temperature: selectedPreset.temperature,
        contextLength: selectedPreset.context_length,
        includeProfileContext: selectedPreset.include_profile_context,
        includeWorkspaceInstructions:
          selectedPreset.include_workspace_instructions,
        embeddingsProvider: selectedPreset.embeddings_provider as
          | "openai"
          | "local"
          | "colbert"
      })
    } else if (selectedWorkspace) {
      // We passed something random -> use default chat settings
      if (!(chatSettingsToUse as ChatSettings)?.model) {
        chatSettingsToUse = {
          model: (selectedWorkspace?.default_model ||
            "file_retriever") as LLMID,
          prompt:
            selectedWorkspace?.default_prompt ||
            "You are a friendly, helpful AI assistant.",
          temperature: selectedWorkspace?.default_temperature || 0.5,
          contextLength: selectedWorkspace?.default_context_length || 4096,
          includeProfileContext:
            selectedWorkspace?.include_profile_context || true,
          includeWorkspaceInstructions:
            selectedWorkspace?.include_workspace_instructions || true,
          embeddingsProvider:
            (selectedWorkspace?.embeddings_provider as
              | "openai"
              | "local"
              | "colbert") || "local"
        }
      }
      // We reset the chat settings to file retriever as this is the default usage
      //    ...otherwise the last chat settings will be used again
      setChatSettings(chatSettingsToUse)
    }

    return router.push(`/${selectedWorkspace.id}/chat`)
  }

  const handleFocusChatInput = () => {
    chatInputRef.current?.focus()
  }

  const handleStopMessage = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleSendMessage = async (
    messageContent: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean
  ) => {
    if (selectedChat?.model && chatSettings?.model != selectedChat?.model) {
      throw {
        message: "Model mismatch!"
      }
    }
    const startingInput = messageContent
    let needToRemoveTempChatMsges = 0

    try {
      setUserInput("")
      setIsGenerating(true)
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setNewMessageImages([])

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      const modelData = [
        ...models.map(model => ({
          modelId: model.model_id as LLMID,
          modelName: model.name,
          provider: "custom" as ModelProvider,
          hostedId: model.id,
          platformLink: "",
          imageInput: false
        })),
        ...LLM_LIST,
        ...availableLocalModels,
        ...availableOpenRouterModels
      ].find(llm => llm.modelId === chatSettings?.model)

      validateChatSettings(
        chatSettings,
        modelData,
        profile,
        selectedWorkspace,
        messageContent
      )

      let currentChat = selectedChat ? { ...selectedChat } : null

      const b64Images = newMessageImages.map(image => image.base64)

      const { tempUserChatMessage, tempAssistantChatMessage } =
        createTempMessages(
          messageContent,
          chatMessages,
          chatSettings!,
          b64Images,
          isRegeneration,
          setChatMessages,
          selectedAssistant,
          profile!
        )
      if (!isRegeneration) {
        needToRemoveTempChatMsges = 2
      }

      // Create a new chat session before first message
      //  We do this so the internally managed providers can save data based on chatID
      if (!currentChat) {
        currentChat = await handleCreateChat(
          chatSettings!,
          profile!,
          selectedWorkspace!,
          messageContent,
          selectedAssistant!,
          // Collection bound chats for retrieval can't have own chat files
          !selectedCollectionCreatorChat ? newMessageFiles : [],
          setSelectedChat,
          setChats,
          setChatFiles
        )
        // We are going to be chatting with a single collection
        if (selectedCollectionCreatorChat) {
          let chatCollectionCreator = await getChatCollectionCreator(
            selectedCollectionCreatorChat.id
          )
          await createChatCollectionConsumer({
            chat_id: currentChat.id,
            collection_id: chatCollectionCreator!.collection_id,
            user_id: profile!.user_id
          })
          setChatFiles([])
          setCollectionRetrievalActive(true)
          setUseRetrieval(true)
          // Information about which file_retriever chat we use to RAG verified files from
          setCollectionCreatorChat(
            await getChatById(chatCollectionCreator!.chat_id)
          )
        }
      } else {
        const updatedChat = await updateChat(currentChat.id, {
          updated_at: new Date().toISOString()
        })

        setChats(prevChats => {
          const updatedChats = prevChats.map(prevChat =>
            prevChat.id === updatedChat.id ? updatedChat : prevChat
          )

          return updatedChats
        })
      }

      let rewrittenQuery: string | undefined

      //TODO: option to disable query rewrite
      if (!isRegeneration && isModelIdFileRetriever(currentChat?.model)) {
        const prevUserMessages = chatMessages
          .filter(msg => msg.message.role === "user")

        if (prevUserMessages.length > 0) {
          setToolInUse("query-rewrite")

          rewrittenQuery = await handleRewriteQueryClient(
            messageContent,
            prevUserMessages
          )

          tempUserChatMessage.message.rewritten_message = rewrittenQuery

          let newMessages = []
          newMessages = [
            ...chatMessages,
            tempUserChatMessage,
            tempAssistantChatMessage
          ]
          setChatMessages(newMessages)
        }
      }

      let retrievedFileItems: Tables<"file_items">[] = []

      /* We either have:
       * 1. Local old or new chat files AND want to use retrieval
       * 2. New chat with given collection to use (collection created by a file_retriever chat)
       * 3. The current chat is bound to use a collection's contents dynamically (old chat given a collection)
       *     AND want to use retrieval
       */
      if (
        // There are files to retrieve
        (((newMessageFiles.length > 0 ||
          chatFiles.length > 0 ||
          collectionRetrievalActive) &&
          //... and we want to retrieve them
          useRetrieval) ||
          //... or we are chatting with verified files from chat
          selectedCollectionCreatorChat) &&
        !isModelIdFileRetriever(currentChat?.model)
      ) {
        setToolInUse("retrieval")

        retrievedFileItems = await handleRetrieval(
          messageContent,
          newMessageFiles,
          chatFiles,
          chatSettings!.embeddingsProvider,
          sourceCount,
          currentChat?.id
        )
      }
      if (isModelIdFileRetriever(currentChat?.model)) {
        // this all this chat does
        setToolInUse("retrieval")
      }

      setSelectedCollectionCreatorChat(null)

      if (retrievedFileItems === undefined || retrievedFileItems === null) {
        toast.error(
          <div>
            Retrieval failed!!!
            <br />
            Try again later or contact admin!
          </div>
        )
        throw Error()
      }

      // TODO: don't pass chatId, workspaceId on external providers
      let payload: ChatPayload = {
        chatId: currentChat!.id,
        workspaceId: selectedWorkspace!.id,
        chatSettings: chatSettings!,
        workspaceInstructions: selectedWorkspace!.instructions || "",
        chatMessages: isRegeneration
          ? [...chatMessages]
          : [...chatMessages, tempUserChatMessage],
        assistant: selectedChat?.assistant_id ? selectedAssistant : null,
        messageFileItems: retrievedFileItems,
        chatFileItems: chatFileItems
      }

      let generatedText = ""

      if (selectedTools.length > 0) {
        setToolInUse("Tools")

        const formattedMessages = await buildFinalMessages(
          payload,
          profile!,
          chatImages
        )

        const response = await fetch("/api/chat/tools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chatSettings: payload.chatSettings,
            messages: formattedMessages,
            selectedTools
          })
        })

        setToolInUse("none")

        generatedText = await processResponse(
          response,
          isRegeneration
            ? payload.chatMessages[payload.chatMessages.length - 1]
            : tempAssistantChatMessage,
          true,
          newAbortController,
          setFirstTokenReceived,
          setChatMessages,
          setToolInUse
        )
      } else {
        if (modelData!.provider === "ollama") {
          generatedText = await handleLocalChat(
            payload,
            profile!,
            chatSettings!,
            tempAssistantChatMessage,
            isRegeneration,
            newAbortController,
            setIsGenerating,
            setFirstTokenReceived,
            setChatMessages,
            setToolInUse
          )
        } else {
          generatedText = await handleHostedChat(
            payload,
            profile!,
            modelData!,
            tempAssistantChatMessage,
            isRegeneration,
            newAbortController,
            newMessageImages,
            chatImages,
            setIsGenerating,
            setFirstTokenReceived,
            setChatMessages,
            setToolInUse,
            setChatFiles,
            setCollections
          )
        }
      }

      needToRemoveTempChatMsges = 0

      await handleCreateMessages(
        chatMessages,
        currentChat,
        profile!,
        modelData!,
        messageContent,
        generatedText,
        newMessageImages,
        isRegeneration,
        retrievedFileItems,
        setChatMessages,
        setChatFileItems,
        setChatImages,
        selectedAssistant,
        rewrittenQuery
      )

      setIsGenerating(false)
      setFirstTokenReceived(false)
      setUserInput("")
    } catch (error) {
      setChatMessages(prevState => {
        if (needToRemoveTempChatMsges > 0) {
          // remove last needToRemoveTempChatMsges elements
          prevState.splice(-needToRemoveTempChatMsges)
          needToRemoveTempChatMsges = 0
        }
        return prevState
      })
      setIsGenerating(false)
      setFirstTokenReceived(false)
      setUserInput(startingInput)
    }
  }

  const handleSendEdit = async (
    editedContent: string,
    sequenceNumber: number
  ) => {
    try {
      if (!selectedChat) return
      const toDelete = chatMessages.filter(
        chatMessage => chatMessage.message.sequence_number >= sequenceNumber
      )

      if (
        !profile?.user_id ||
        toDelete.some(
          msgToDelete => msgToDelete.message.user_id !== profile?.user_id
        )
      ) {
        throw {
          message: "Unauthorised"
        }
      }

      await deleteMessagesIncludingAndAfter(
        profile?.user_id,
        selectedChat.id,
        sequenceNumber
      )

      if (
        isModelIdFileRetriever(selectedChat.model) &&
        selectedChat.model === chatSettings?.model
      ) {
        await deleteChatFilesIncludingAndAfter(
          profile?.user_id,
          selectedChat.id,
          sequenceNumber
        )
      }

      const filteredMessages = chatMessages.filter(
        chatMessage => chatMessage.message.sequence_number < sequenceNumber
      )

      setChatMessages(filteredMessages)

      handleSendMessage(editedContent, filteredMessages, false)
    } catch (e) {
      toast.error((e as any)?.message ?? "Can't edit this message!")
    }
  }

  return {
    chatInputRef,
    prompt,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendEdit
  }
}
