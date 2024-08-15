import { FC, useContext } from "react"
import { Button } from "@/components/ui/button"
import { ChatbotUIContext } from "@/context/context"
import { useRouter } from "next/navigation"
import { IconFileImport } from "@tabler/icons-react"
import { WithTooltip } from "@/components/ui/with-tooltip"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"

interface ChatCollectionConsumerButtonProps {}
export const ChatCollectionConsumerButton: FC<
  ChatCollectionConsumerButtonProps
> = ({}) => {
  const router = useRouter()

  const chatHandler = useChatHandler()

  const { selectedChat, isGenerating, setSelectedCollectionCreatorChat } =
    useContext(ChatbotUIContext)

  if (selectedChat?.model !== "file_retriever") {
    return undefined
  }

  return (
    <div className="flex h-[36px]">
      <WithTooltip
        delayDuration={0}
        side="top"
        display={
          <div>
            <strong className="font-semibold">Feature:</strong> The new chat
            will be{" "}
            <span className="font-semibold text-blue-900 underline dark:text-blue-300">
              consistently updated
            </span>{" "}
            with all{" "}
            <span className="font-semibold text-blue-900 dark:text-blue-300">
              approved files
            </span>{" "}
            from this session.
          </div>
        }
        trigger={
          <Button
            disabled={isGenerating}
            className={
              "group relative flex size-[30px] items-center justify-between overflow-hidden rounded p-0 py-1 transition-all duration-300 ease-in-out hover:w-[154px] hover:px-2"
            }
            onClick={async () => {
              setSelectedCollectionCreatorChat(selectedChat)
              void chatHandler.handleNewChat()
            }}
          >
            <IconFileImport
              className="m-auto size-[20px] transition-all duration-300 ease-in-out"
              size={20}
            />
            <span className="inline-block w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out group-hover:w-[118px]">
              Chat with Files
            </span>
          </Button>
        }
      />
    </div>
  )
}
