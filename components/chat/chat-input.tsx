import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import {
  IconBolt,
  IconCirclePlus,
  IconPlayerStopFilled,
  IconSend,
  IconX
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useEffect, useRef, useState } from "react"
import { useMessageStore, useStore } from "@/context/context"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { ChatCommandInput } from "./chat-command-input"
import { ChatFilesDisplay } from "./chat-files-display"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { useChatHistoryHandler } from "./chat-hooks/use-chat-history"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { useSelectMultipleFilesHandler } from "./chat-hooks/use-select-multiple-files-handler"
import { ChatCollectionConsumerButton } from "@/components/chat/chat-collection-consumer-button"
import { isModelIdFileRetriever } from "@/types"

interface ChatInputProps {}

export const ChatInput: FC<ChatInputProps> = ({}) => {
  const { t } = useTranslation()

  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)

  const {
    isAssistantPickerOpen,
    focusAssistant,
    setFocusAssistant,
    userInput,
    isGenerating,
    selectedPreset,
    selectedAssistant,
    focusPrompt,
    setFocusPrompt,
    focusFile,
    focusTool,
    setFocusTool,
    isToolPickerOpen,
    isPromptPickerOpen,
    setIsPromptPickerOpen,
    isFilePickerOpen,
    setFocusFile,
    chatSettings,
    selectedTools,
    setSelectedTools,
    assistantImages,
    selectedCollectionCreatorChat,
    setSelectedCollectionCreatorChat
  } = useStore()

  const { chatMessages } = useMessageStore()

  const {
    chatInputRef,
    handleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  const { handleInputChange } = usePromptAndCommand()

  const { filesToAccept, handleSelectDeviceFiles } =
    useSelectMultipleFilesHandler()

  const {
    setNewMessageContentToNextUserMessage,
    setNewMessageContentToPreviousUserMessage
  } = useChatHistoryHandler()

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      handleFocusChatInput()
    }, 200) // FIX: hacky
  }, [selectedPreset, selectedAssistant])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isTyping && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      setIsPromptPickerOpen(false)
      handleSendMessage(userInput, chatMessages, false)
    }

    // Consolidate conditions to avoid TypeScript error
    if (
      isPromptPickerOpen ||
      isFilePickerOpen ||
      isToolPickerOpen ||
      isAssistantPickerOpen
    ) {
      if (
        event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault()
        // Toggle focus based on picker type
        if (isPromptPickerOpen) setFocusPrompt(!focusPrompt)
        if (isFilePickerOpen) setFocusFile(!focusFile)
        if (isToolPickerOpen) setFocusTool(!focusTool)
        if (isAssistantPickerOpen) setFocusAssistant(!focusAssistant)
      }
    }

    if (event.key === "ArrowUp" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToPreviousUserMessage()
    }

    if (event.key === "ArrowDown" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToNextUserMessage()
    }

    //use shift+ctrl+up and shift+ctrl+down to navigate through chat history
    if (event.key === "ArrowUp" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToPreviousUserMessage()
    }

    if (event.key === "ArrowDown" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToNextUserMessage()
    }

    if (
      isAssistantPickerOpen &&
      (event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault()
      setFocusAssistant(!focusAssistant)
    }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const imagesAllowed = LLM_LIST.find(
      llm => llm.modelId === chatSettings?.model
    )?.imageInput

    const items = event.clipboardData.items
    for (const item of items) {
      if (item.type.indexOf("image") === 0) {
        if (!imagesAllowed) {
          toast.error(
            `Images are not supported for this model. Use models like GPT-4 Vision instead.`
          )
          return
        }
        const file = item.getAsFile()
        if (!file) return
        //TODO: support uploading files in chat
        //handleSelectDeviceFiles(file)
      }
    }
  }

  return (
    <>
      <div className="flex flex-col flex-wrap justify-center gap-2">
        {chatSettings?.model !== "file_retriever" ? (
          <ChatFilesDisplay />
        ) : undefined}

        {selectedTools &&
          selectedTools.map((tool, index) => (
            <div
              key={index}
              className="flex justify-center"
              onClick={() =>
                setSelectedTools(
                  selectedTools.filter(
                    selectedTool => selectedTool.id !== tool.id
                  )
                )
              }
            >
              <div className="flex cursor-pointer items-center justify-center space-x-1 rounded-lg bg-purple-600 px-3 py-1 hover:opacity-50">
                <IconBolt size={20} />

                <div>{tool.name}</div>
              </div>
            </div>
          ))}

        {selectedCollectionCreatorChat && (
          <div className="relative mx-auto flex w-fit cursor-pointer items-center space-x-2 rounded-lg border p-1.5 hover:opacity-50">
            <div className="text-sm font-bold">
              Talking with the approved files from{" "}
              {`"${selectedCollectionCreatorChat.name}"`}
            </div>

            <IconX
              className="bg-muted-foreground border-primary absolute right-[-6px] top-[-6px] flex size-5 cursor-pointer items-center justify-center rounded-full border-DEFAULT text-[10px] hover:border-red-500 hover:bg-white hover:text-red-500"
              onClick={e => {
                e.stopPropagation()
                setSelectedCollectionCreatorChat(null)
              }}
            />
          </div>
        )}
        {selectedAssistant && (
          <div className="border-primary mx-auto flex w-fit items-center space-x-2 rounded-lg border p-1.5">
            {selectedAssistant.image_path && (
              <Image
                className="rounded"
                src={
                  assistantImages.find(
                    img => img.path === selectedAssistant.image_path
                  )?.base64
                }
                width={28}
                height={28}
                alt={selectedAssistant.name}
              />
            )}

            <div className="text-sm font-bold">
              Talking to {selectedAssistant.name}
            </div>
          </div>
        )}
      </div>

      <div className="border-input relative mt-3 flex min-h-[60px] w-full items-center justify-center rounded-xl border-2">
        <div className="absolute bottom-[76px] left-0 max-h-[300px] w-full overflow-auto rounded-xl dark:border-none">
          <ChatCommandInput />
        </div>

        {false && (
          <>
            <IconCirclePlus
              className="absolute bottom-[12px] left-3 cursor-pointer p-1 hover:opacity-50"
              size={32}
              onClick={() => fileInputRef.current?.click()}
            />

            {/* Hidden input to select files from device */}
            <Input
              ref={fileInputRef}
              className="hidden"
              type="file"
              onChange={e => {
                if (!e.target.files) {
                  console.log(`Upload file: failed - no files`)
                  return
                }
                console.log(`Upload file: circle: ${e.target.files[0].name}`)
                //TODO: support uploading files in chat
                //handleSelectDeviceFiles(e.target.files[0])
              }}
              accept={filesToAccept}
            />
          </>
        )}

        <TextareaAutosize
          textareaRef={chatInputRef}
          className="ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md flex w-full resize-none rounded-md border-none bg-transparent py-2 pl-4 pr-14 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={
            // `Ask anything. Type "@" for assistants, "/" for prompts, "#" for files, and "!" for tools.`
            (isModelIdFileRetriever(chatSettings?.model)
              ? `Ask anything - files`
              : `Ask anything - chat`
            ).toTranslationKey(t)
          }
          onValueChange={handleInputChange}
          value={userInput}
          minRows={1}
          maxRows={18}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
        />

        <div className="absolute right-3 flex flex-row items-center align-middle">
          {/* Activate creating file chats with the approved retrieved files */}
          <ChatCollectionConsumerButton />
          <div className="w-1" />
          <div className="cursor-pointer hover:opacity-50">
            {isGenerating ? (
              <IconPlayerStopFilled
                className="hover:bg-background animate-pulse rounded bg-transparent p-1"
                onClick={handleStopMessage}
                size={30}
              />
            ) : (
              <IconSend
                className={cn(
                  "bg-primary text-secondary rounded p-1",
                  !userInput && "cursor-not-allowed opacity-50"
                )}
                onClick={() => {
                  if (!userInput) return

                  handleSendMessage(userInput, chatMessages, false)
                }}
                size={30}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
