import { FC } from "react"
import { useStore } from "@/context/context"
import { Button } from "@/components/ui/button"
import { IconFileImport } from "@tabler/icons-react"
import { WithTooltip } from "@/components/ui/with-tooltip"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { LLMID, ModelProvider } from "@/types"

interface ChatCollectionConsumerButtonProps {}
export const ChatCollectionConsumerButton: FC<
  ChatCollectionConsumerButtonProps
> = ({}) => {
  const chatHandler = useChatHandler()

  const {
    setChatSettings,
    setSelectedCollectionCreatorChat,
    selectedWorkspace,
    selectedChat,
    isGenerating,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  } = useStore()

  if (selectedChat?.model !== "file_retriever") {
    return undefined
  }

  const allModels = [
    ...models.map(model => ({
      modelId: model.model_id as LLMID,
      modelName: model.name,
      provider: "custom" as ModelProvider,
      hostedId: model.id,
      platformLink: "",
      imageInput: false
    })),
    ...availableHostedModels,
    ...availableLocalModels,
    ...availableOpenRouterModels
  ]

  return (
    <div className="flex h-[36px]">
      <WithTooltip
        delayDuration={0}
        side="top"
        display={
          <div>
            <strong className="font-semibold">Feature:</strong> Create a new
            chat{" "}
            <span className="font-semibold text-blue-900 underline dark:text-blue-300">
              consistently updated
            </span>{" "}
            with all of the{" "}
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
              await chatHandler.handleNewChat({
                model: (selectedWorkspace?.default_chat_model ||
                  "gpt-4-vision-preview") as LLMID,
                prompt:
                  selectedWorkspace?.default_prompt ||
                  "You are a friendly, helpful AI assistant.",
                temperature: selectedWorkspace?.default_temperature || 0.5,
                contextLength:
                  selectedWorkspace?.default_context_length || 4096,
                includeProfileContext:
                  selectedWorkspace?.include_profile_context || true,
                includeWorkspaceInstructions:
                  selectedWorkspace?.include_workspace_instructions || true,
                embeddingsProvider:
                  (selectedWorkspace?.embeddings_provider as
                    | "openai"
                    | "local"
                    | "colbert") || "local"
              })
              setSelectedCollectionCreatorChat(selectedChat)
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
