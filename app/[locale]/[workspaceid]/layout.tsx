"use client"

import "@/lib/i18-helpers"
import { Dashboard } from "@/components/ui/dashboard"
import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getFoldersByWorkspaceId } from "@/db/folders"
import { getModelWorkspacesByWorkspaceId } from "@/db/models"
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets"
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts"
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images"
import { getToolWorkspacesByWorkspaceId } from "@/db/tools"
import { getWorkspaceById } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { supabase } from "@/lib/supabase/browser-client"
import { LLMID } from "@/types"
import { useParams, useRouter } from "next/navigation"
import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useMessageStore, useStore } from "@/context/context"
import Loading from "../loading"
import { Tables } from "@/supabase/types"
import { getRules } from "@/db/rules"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()

  const params = useParams()
  const workspaceId = params.workspaceid as string

  const {
    setChatSettings,
    setAssistants,
    setAssistantImages,
    setChats,
    setCollections,
    setFolders,
    setFiles,
    setPresets,
    setPrompts,
    setTools,
    setModels,
    setRules,
    selectedWorkspace,
    setSelectedWorkspace,
    setSelectedChat,
    setUserInput,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay,
    workspaces,
    chatSettings,
    rules
  } = useStore()

  const { setChatMessages } = useMessageStore()

  const [loading, setLoading] = useState(true)

  const workspaceLoaded = useRef<string | null>(null)
  const workspaceFetching = useRef<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session

      if (!session) {
        return router.push("/login")
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => await fetchWorkspaceData(workspaceId, workspaces))()
  }, [workspaceId, workspaces])

  useEffect(() => {
    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
  }, [workspaceId])

  const fetchWorkspaceData = async (
    workspaceId: string,
    workspaces: Tables<"workspaces">[]
  ) => {
    if (!workspaceId || workspaces.length === 0) {
      return
    }
    // We have lost state - rules is usually > 0
    if (rules.length === 0) {
      workspaceLoaded.current = null
    }
    if (
      workspaceLoaded.current === workspaceId ||
      workspaceFetching.current === workspaceId
    ) {
      return
    }
    workspaceFetching.current = workspaceId
    setLoading(true)

    const workspace = await getWorkspaceById(workspaceId)
    setSelectedWorkspace(workspace)

    const assistantData = await getAssistantWorkspacesByWorkspaceId(workspaceId)
    setAssistants(assistantData.assistants)

    for (const assistant of assistantData.assistants) {
      let url = ""

      if (assistant.image_path) {
        url = (await getAssistantImageFromStorage(assistant.image_path)) || ""
      }

      if (url) {
        const response = await fetch(url)
        const blob = await response.blob()
        const base64 = await convertBlobToBase64(blob)

        setAssistantImages(prev => [
          ...prev,
          {
            assistantId: assistant.id,
            path: assistant.image_path,
            base64,
            url
          }
        ])
      } else {
        setAssistantImages(prev => [
          ...prev,
          {
            assistantId: assistant.id,
            path: assistant.image_path,
            base64: "",
            url
          }
        ])
      }
    }

    const chats = await getChatsByWorkspaceId(workspaceId, workspaces)

    const collectionData =
      await getCollectionWorkspacesByWorkspaceId(workspaceId)

    const folders = await getFoldersByWorkspaceId(workspaceId, workspaces)

    const fileData = await getFileWorkspacesByWorkspaceId(workspaceId)

    const presetData = await getPresetWorkspacesByWorkspaceId(workspaceId)

    const promptData = await getPromptWorkspacesByWorkspaceId(workspaceId)

    const toolData = await getToolWorkspacesByWorkspaceId(workspaceId)

    const modelData = await getModelWorkspacesByWorkspaceId(workspaceId)

    const rulesLocal = await getRules()

    setChats(chats)
    setCollections(collectionData ?? [])
    setFolders(folders)
    setFiles(fileData ?? [])
    setPresets(presetData.presets)
    setPrompts(promptData.prompts)
    setTools(toolData.tools)
    setModels(modelData.models)
    setRules(rulesLocal)

    // Really important as async functions are out of state
    if (!chatSettings?.model && !useStore.getState().chatSettings?.model) {
      setChatSettings({
        model: (workspace?.default_model || "gpt-4-1106-preview") as LLMID,
        prompt:
          workspace?.default_prompt ||
          "You are a friendly, helpful AI assistant.",
        temperature: workspace?.default_temperature || 0.5,
        contextLength: workspace?.default_context_length || 4096,
        includeProfileContext: workspace?.include_profile_context || true,
        includeWorkspaceInstructions:
          workspace?.include_workspace_instructions || true,
        embeddingsProvider:
          (workspace?.embeddings_provider as "openai" | "local" | "colbert") ||
          "openai"
      })
    }

    setLoading(false)
    workspaceLoaded.current = workspaceId
    workspaceFetching.current = null
  }

  if (loading) {
    return <Loading />
  }

  return <Dashboard>{children}</Dashboard>
}
