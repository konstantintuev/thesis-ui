"use client"

import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { ChatSettings, isModelIdFileRetriever, LLMID } from "@/types"
import {
  IconAdjustmentsHorizontal,
  IconInfoCircle,
  IconRepeat
} from "@tabler/icons-react"
import { FC } from "react"
import { useStore } from "@/context/context"
import { ModelSelect } from "../models/model-select"
import { AdvancedSettings } from "./advanced-settings"
import { Checkbox } from "./checkbox"
import { Label } from "./label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./select"
import { Slider } from "./slider"
import { TextareaAutosize } from "./textarea-autosize"
import { WithTooltip } from "./with-tooltip"
import { FileProcessingSelect } from "@/components/document/file-processing-select"
import { FileProcessor } from "@/types/file-processing"
import { Button } from "@/components/ui/button"

interface ChatSettingsFormProps {
  retrieverSettings?: ChatSettings
  onChangeRetrieverSettings?: (value: ChatSettings) => void
  chatSettings: ChatSettings
  onChangeChatSettings: (value: ChatSettings) => void
  selectedProcessorId?: string
  onSelectProcessor?: (processorId: FileProcessor) => void
  useAdvancedDropdown?: boolean
  showTooltip?: boolean
}

export const ChatSettingsForm: FC<ChatSettingsFormProps> = ({
  retrieverSettings,
  onChangeRetrieverSettings,
  chatSettings,
  onChangeChatSettings,
  selectedProcessorId,
  onSelectProcessor,
  useAdvancedDropdown = true,
  showTooltip = true
}) => {
  const { profile, selectedWorkspace } = useStore()

  if (!profile) return null

  const changingGlobalSettings = !!retrieverSettings

  const switchChatAndRetrieval = () => {
    if (!selectedWorkspace) return
    if (isModelIdFileRetriever(chatSettings.model)) {
      onChangeChatSettings({
        ...chatSettings,
        model: selectedWorkspace?.default_chat_model as LLMID
      })
    } else {
      onChangeChatSettings({
        ...chatSettings,
        model: selectedWorkspace?.default_model as LLMID
      })
    }
  }

  return (
    <div className="space-y-3">
      {changingGlobalSettings && onChangeRetrieverSettings && (
        <div className="space-y-1">
          <Label>File Retrieval Model</Label>

          <ModelSelect
            selectedModelId={retrieverSettings.model}
            onSelectModel={model => {
              onChangeRetrieverSettings({ ...retrieverSettings, model })
            }}
            limitToProvider={"file_retriever"}
          />
        </div>
      )}

      <div className="space-y-1">
        <Label>{changingGlobalSettings ? "Chat Model" : "Model"}</Label>

        <div className="flex flex-row items-center">
          <ModelSelect
            selectedModelId={chatSettings.model}
            onSelectModel={model => {
              onChangeChatSettings({ ...chatSettings, model })
            }}
            excludeProvider={
              changingGlobalSettings ? "file_retriever" : undefined
            }
          />
          <div className="mx-1" />
          {!changingGlobalSettings && (
            <WithTooltip
              delayDuration={0}
              side="top"
              display={<div>Switch between file retrieval and chat</div>}
              trigger={
                <Button
                  className="flex h-full items-center space-x-2"
                  variant="secondary"
                >
                  <IconRepeat size={26} onClick={switchChatAndRetrieval} />
                </Button>
              }
            />
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Prompt</Label>

        <TextareaAutosize
          className="bg-background border-input border-2"
          placeholder="You are a helpful AI assistant."
          onValueChange={prompt => {
            onChangeChatSettings({ ...chatSettings, prompt })
          }}
          value={chatSettings.prompt}
          minRows={3}
          maxRows={6}
        />
      </div>

      {selectedProcessorId && onSelectProcessor && (
        <div className="space-y-1">
          <Label>File Processor</Label>

          <FileProcessingSelect
            selectedProcessorId={selectedProcessorId}
            onSelectProcessor={onSelectProcessor}
          />
        </div>
      )}

      {useAdvancedDropdown ? (
        <AdvancedSettings>
          <AdvancedContent
            chatSettings={chatSettings}
            onChangeChatSettings={onChangeChatSettings}
            showTooltip={showTooltip}
          />
        </AdvancedSettings>
      ) : (
        <div>
          <AdvancedContent
            chatSettings={chatSettings}
            onChangeChatSettings={onChangeChatSettings}
            showTooltip={showTooltip}
          />
        </div>
      )}
    </div>
  )
}

interface AdvancedContentProps {
  chatSettings: ChatSettings
  onChangeChatSettings: (value: ChatSettings) => void
  showTooltip: boolean
}

const AdvancedContent: FC<AdvancedContentProps> = ({
  chatSettings,
  onChangeChatSettings,
  showTooltip
}) => {
  const { profile, selectedWorkspace, availableOpenRouterModels, models } =
    useStore()

  const isCustomModel = models.some(
    model => model.model_id === chatSettings.model
  )

  function findOpenRouterModel(modelId: string) {
    return availableOpenRouterModels.find(model => model.modelId === modelId)
  }

  const MODEL_LIMITS = CHAT_SETTING_LIMITS[chatSettings.model] || {
    MIN_TEMPERATURE: 0,
    MAX_TEMPERATURE: 1,
    MAX_CONTEXT_LENGTH:
      findOpenRouterModel(chatSettings.model)?.maxContext || 4096
  }

  return (
    <div className="mt-5">
      <div className="space-y-3">
        <Label className="flex items-center space-x-1">
          <div>Temperature:</div>

          <div>{chatSettings.temperature}</div>
        </Label>

        <Slider
          value={[chatSettings.temperature]}
          onValueChange={temperature => {
            onChangeChatSettings({
              ...chatSettings,
              temperature: temperature[0]
            })
          }}
          min={MODEL_LIMITS.MIN_TEMPERATURE}
          max={MODEL_LIMITS.MAX_TEMPERATURE}
          step={0.01}
        />
      </div>

      <div className="mt-6 space-y-3">
        <Label className="flex items-center space-x-1">
          <div>Context Length:</div>

          <div>{chatSettings.contextLength}</div>
        </Label>

        <Slider
          value={[chatSettings.contextLength]}
          onValueChange={contextLength => {
            onChangeChatSettings({
              ...chatSettings,
              contextLength: contextLength[0]
            })
          }}
          min={0}
          max={
            isCustomModel
              ? models.find(model => model.model_id === chatSettings.model)
                  ?.context_length
              : MODEL_LIMITS.MAX_CONTEXT_LENGTH
          }
          step={1}
        />
      </div>

      <div className="mt-7 flex items-center space-x-2">
        <Checkbox
          checked={chatSettings.includeProfileContext}
          onCheckedChange={(value: boolean) =>
            onChangeChatSettings({
              ...chatSettings,
              includeProfileContext: value
            })
          }
        />

        <Label>Chats Include Profile Context</Label>

        {showTooltip && (
          <WithTooltip
            delayDuration={0}
            display={
              <div className="w-[400px] p-3">
                {profile?.profile_context || "No profile context."}
              </div>
            }
            trigger={
              <IconInfoCircle className="cursor-hover:opacity-50" size={16} />
            }
          />
        )}
      </div>

      <div className="mt-4 flex items-center space-x-2">
        <Checkbox
          checked={chatSettings.includeWorkspaceInstructions}
          onCheckedChange={(value: boolean) =>
            onChangeChatSettings({
              ...chatSettings,
              includeWorkspaceInstructions: value
            })
          }
        />

        <Label>Chats Include Workspace Instructions</Label>

        {showTooltip && (
          <WithTooltip
            delayDuration={0}
            display={
              <div className="w-[400px] p-3">
                {selectedWorkspace?.instructions ||
                  "No workspace instructions."}
              </div>
            }
            trigger={
              <IconInfoCircle className="cursor-hover:opacity-50" size={16} />
            }
          />
        )}
      </div>

      <div className="mt-5">
        <Label>Embeddings Provider</Label>

        <Select
          value={chatSettings.embeddingsProvider}
          onValueChange={(
            embeddingsProvider: "openai" | "local" | "colbert"
          ) => {
            onChangeChatSettings({
              ...chatSettings,
              embeddingsProvider
            })
          }}
        >
          <SelectTrigger>
            <SelectValue defaultValue="openai" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="openai">
              {profile?.use_azure_openai ? "Azure OpenAI" : "OpenAI"}
            </SelectItem>


            <SelectItem value="local">Local - BGE-M3</SelectItem>


            <SelectItem value="colbert">Colbert</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
