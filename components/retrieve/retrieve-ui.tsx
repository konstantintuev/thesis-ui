import Loading from "@/app/[locale]/loading"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { getChatFilesByChatId } from "@/db/chat-files"
import { getChatById } from "@/db/chats"
import { getMessageFileItemsByMessageId } from "@/db/message-file-items"
import { getMessagesByChatId } from "@/db/messages"
import { getMessageImageFromStorage } from "@/db/storage/message-images"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLMID, MessageImage } from "@/types"
import { useParams } from "next/navigation"
import { FC, useContext, useEffect, useState } from "react"
import { ChatSecondaryButtons } from "../chat/chat-secondary-buttons"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatHelp } from "@/components/chat/chat-help"
import { ChatMessages } from "../chat/chat-messages"
import { RetrieveFiles } from "@/components/retrieve/retrieve-files"
import { Message } from "@/components/messages/message"

interface RetrieveUIProps {}

export const RetrieveUI: FC<RetrieveUIProps> = ({}) => {
  const params = useParams()

  const {
    setChatMessages,
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
    setSelectedTools
  } = useContext(ChatbotUIContext)

  return (
    <div className="relative flex h-full flex-col items-center">
      <div className="absolute right-4 top-1 flex h-[40px] items-center space-x-2">
        <ChatSecondaryButtons />
      </div>

      <div className="bg-secondary flex max-h-[50px] min-h-[50px] w-full items-center justify-center border-b-2 font-bold">
        <div className="max-w-[200px] truncate sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px] xl:max-w-[700px]">
          {selectedChat?.name || "Chat"}
        </div>
      </div>

      <div className="flex size-full flex-col overflow-auto border-b">
        {/*<RetrieveFiles/>*/}
        {[
          {
            msg:
              "Relevance: 10/10 (Vector Search: 8/10; Company Rules: 10/10; File Age: 10/10; etc.)\n" +
              "- a more detailed breakdown of each company rule applied should be possible Given your question, the following document was found to address the following points:\n" +
              "- Information about ...\n" +
              "- Details about ...",
            files: ["CompanyFile_ 1.pdf"]
          }
        ].map(chatMessage => {
          const messageFileItems = retrieveFileItems.filter(
            (chatFileItem, _, self) =>
              chatMessage.fileItems.includes(chatFileItem.id) &&
              self.findIndex(item => item.id === chatFileItem.id) === _
          )

          return (
            <Message
              key={chatMessage.message.sequence_number}
              message={chatMessage.message}
              fileItems={messageFileItems}
              isEditing={false}
              isLast={false}
              onStartEdit={setEditingMessage}
              onCancelEdit={() => setEditingMessage(undefined)}
              onSubmitEdit={handleSendEdit}
            />
          )
        })}
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
