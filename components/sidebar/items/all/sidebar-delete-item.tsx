import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { deleteAssistant } from "@/db/assistants"
import { deleteChat } from "@/db/chats"
import { deleteCollection } from "@/db/collections"
import { deleteFile } from "@/db/files"
import { deleteModel } from "@/db/models"
import { deletePreset } from "@/db/presets"
import { deletePrompt } from "@/db/prompts"
import { deleteFileFromStorage } from "@/db/storage/files"
import { deleteTool } from "@/db/tools"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType } from "@/types"
import { FC, useRef, useState } from "react"
import { useStore } from "@/context/context"
import { deleteTeam } from "@/db/teams"
import { deleteRule } from "@/db/rules"
import { toast } from "sonner"

interface SidebarDeleteItemProps {
  item: DataItemType
  contentType: ContentType
}

export const SidebarDeleteItem: FC<SidebarDeleteItemProps> = ({
  item,
  contentType
}) => {
  const {
    setChats,
    setPresets,
    setPrompts,
    setFiles,
    setCollections,
    setAssistants,
    setTools,
    setModels,
    setTeams,
    setRules
  } = useStore()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showDialog, setShowDialog] = useState(false)

  const deleteFunctions = {
    chats: async (chat: Tables<"chats">) => {
      return await deleteChat(chat.id)
    },
    presets: async (preset: Tables<"presets">) => {
      return await deletePreset(preset.id)
    },
    prompts: async (prompt: Tables<"prompts">) => {
      return await deletePrompt(prompt.id)
    },
    files: async (file: Tables<"files">) => {
      await deleteFileFromStorage(file.file_path)
      return await deleteFile(file.id)
    },
    collections: async (collection: Tables<"collections">) => {
      return await deleteCollection(collection.id)
    },
    assistants: async (assistant: Tables<"assistants">) => {
      let res = await deleteAssistant(assistant.id)
      if (res) {
        setChats(prevState =>
          prevState.filter(chat => chat.assistant_id !== assistant.id)
        )
      }
      return res
    },
    tools: async (tool: Tables<"tools">) => {
      return await deleteTool(tool.id)
    },
    models: async (model: Tables<"models">) => {
      return await deleteModel(model.id)
    },
    teams: async (team: Tables<"teams">) => {
      return await deleteTeam(team.id)
    },
    rules: async (rule: Tables<"rules">) => {
      return await deleteRule(rule.id)
    }
  }

  const stateUpdateFunctions = {
    chats: setChats,
    presets: setPresets,
    prompts: setPrompts,
    files: setFiles,
    collections: setCollections,
    assistants: setAssistants,
    tools: setTools,
    models: setModels,
    teams: setTeams,
    rules: setRules
  }

  const handleDelete = async () => {
    const deleteFunction = deleteFunctions[contentType]
    const setStateFunction = stateUpdateFunctions[contentType]

    if (!deleteFunction || !setStateFunction) return

    if (await deleteFunction(item as any)) {
      setStateFunction((prevItems: any) =>
        prevItems.filter((prevItem: any) => prevItem.id !== item.id)
      )
    } else {
      toast.error("Not authorised to delete!")
    }

    setShowDialog(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="text-red-500" variant="ghost">
          Delete
        </Button>
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Delete {contentType.slice(0, -1)}</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete {item.name}?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowDialog(false)}>
            Cancel
          </Button>

          <Button ref={buttonRef} variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
