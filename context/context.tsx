import { Tables } from "@/supabase/types"
import { TeamAndMe } from "@/components/sidebar/items/teams/teams-select"
import { VALID_ENV_KEYS } from "@/types/valid-keys"
import {
  AssistantImage,
  ChatFile,
  ChatMessage,
  ChatSettings,
  LLM,
  MessageImage,
  OpenRouterLLM,
  WorkspaceImage
} from "@/types"
import { FileProcessor } from "@/types/file-processing"
import { IHighlight } from "@/components/document/react-pdf-highlighter"
import { create } from "zustand"

type SetStateAction<S> = S | ((prevState: S) => S)
type Dispatch<A> = (value: A) => void

interface StoreState {
  // PROFILE STORE
  profile: Tables<"profiles"> | null
  setProfile: Dispatch<SetStateAction<Tables<"profiles"> | null>>

  // ITEMS STORE
  assistants: Tables<"assistants">[]
  setAssistants: Dispatch<SetStateAction<Tables<"assistants">[]>>

  collections: Tables<"collections">[]
  setCollections: Dispatch<SetStateAction<Tables<"collections">[]>>

  chats: Tables<"chats">[]
  setChats: Dispatch<SetStateAction<Tables<"chats">[]>>

  files: Tables<"files">[]
  setFiles: Dispatch<SetStateAction<Tables<"files">[]>>

  folders: Tables<"folders">[]
  setFolders: Dispatch<SetStateAction<Tables<"folders">[]>>

  models: Tables<"models">[]
  setModels: Dispatch<SetStateAction<Tables<"models">[]>>

  presets: Tables<"presets">[]
  setPresets: Dispatch<SetStateAction<Tables<"presets">[]>>

  prompts: Tables<"prompts">[]
  setPrompts: Dispatch<SetStateAction<Tables<"prompts">[]>>

  tools: Tables<"tools">[]
  setTools: Dispatch<SetStateAction<Tables<"tools">[]>>

  workspaces: Tables<"workspaces">[]
  setWorkspaces: Dispatch<SetStateAction<Tables<"workspaces">[]>>

  teams: TeamAndMe[]
  setTeams: Dispatch<SetStateAction<TeamAndMe[]>>

  rules: Tables<"rules">[]
  setRules: Dispatch<SetStateAction<Tables<"rules">[]>>

  // MODELS STORE
  envKeyMap: Record<string, VALID_ENV_KEYS>
  setEnvKeyMap: Dispatch<SetStateAction<Record<string, VALID_ENV_KEYS>>>

  availableHostedModels: LLM[]
  setAvailableHostedModels: Dispatch<SetStateAction<LLM[]>>

  availableLocalModels: LLM[]
  setAvailableLocalModels: Dispatch<SetStateAction<LLM[]>>

  availableOpenRouterModels: OpenRouterLLM[]
  setAvailableOpenRouterModels: Dispatch<SetStateAction<OpenRouterLLM[]>>

  // FILE PROCESSING STORE
  availableFileProcessors: FileProcessor[]
  setAvailableFileProcessors: Dispatch<SetStateAction<FileProcessor[]>>

  // WORKSPACE STORE
  selectedWorkspace: Tables<"workspaces"> | null
  setSelectedWorkspace: Dispatch<SetStateAction<Tables<"workspaces"> | null>>

  workspaceImages: WorkspaceImage[]
  setWorkspaceImages: Dispatch<SetStateAction<WorkspaceImage[]>>

  // PRESET STORE
  selectedPreset: Tables<"presets"> | null
  setSelectedPreset: Dispatch<SetStateAction<Tables<"presets"> | null>>

  // ASSISTANT STORE
  selectedAssistant: Tables<"assistants"> | null
  setSelectedAssistant: Dispatch<SetStateAction<Tables<"assistants"> | null>>

  assistantImages: AssistantImage[]
  setAssistantImages: Dispatch<SetStateAction<AssistantImage[]>>

  openaiAssistants: any[]
  setOpenaiAssistants: Dispatch<SetStateAction<any[]>>

  // PASSIVE CHAT STORE
  userInput: string
  setUserInput: Dispatch<SetStateAction<string>>

  chatSettings: ChatSettings | null
  setChatSettings: Dispatch<SetStateAction<ChatSettings | null>>

  selectedChat: Tables<"chats"> | null
  setSelectedChat: Dispatch<SetStateAction<Tables<"chats"> | null>>

  chatFileItems: Tables<"file_items">[]
  setChatFileItems: Dispatch<SetStateAction<Tables<"file_items">[]>>

  chatFileHighlights: Record<string, IHighlight[]>
  setChatFileHighlights: Dispatch<SetStateAction<Record<string, IHighlight[]>>>

  selectedCollectionCreatorChat: Tables<"chats"> | null
  setSelectedCollectionCreatorChat: Dispatch<
    SetStateAction<Tables<"chats"> | null>
  >

  // ACTIVE CHAT STORE
  isGenerating: boolean
  setIsGenerating: Dispatch<SetStateAction<boolean>>

  firstTokenReceived: boolean
  setFirstTokenReceived: Dispatch<SetStateAction<boolean>>

  abortController: AbortController | null
  setAbortController: Dispatch<SetStateAction<AbortController | null>>

  scrollHeight: {
    pageId: string
    scrollTop: number
  }

  // CHAT INPUT COMMAND STORE
  isPromptPickerOpen: boolean
  setIsPromptPickerOpen: Dispatch<SetStateAction<boolean>>

  slashCommand: string
  setSlashCommand: Dispatch<SetStateAction<string>>

  isFilePickerOpen: boolean
  setIsFilePickerOpen: Dispatch<SetStateAction<boolean>>

  hashtagCommand: string
  setHashtagCommand: Dispatch<SetStateAction<string>>

  isToolPickerOpen: boolean
  setIsToolPickerOpen: Dispatch<SetStateAction<boolean>>

  toolCommand: string
  setToolCommand: Dispatch<SetStateAction<string>>

  focusPrompt: boolean
  setFocusPrompt: Dispatch<SetStateAction<boolean>>

  focusFile: boolean
  setFocusFile: Dispatch<SetStateAction<boolean>>

  focusTool: boolean
  setFocusTool: Dispatch<SetStateAction<boolean>>

  focusAssistant: boolean
  setFocusAssistant: Dispatch<SetStateAction<boolean>>

  atCommand: string
  setAtCommand: Dispatch<SetStateAction<string>>

  isAssistantPickerOpen: boolean
  setIsAssistantPickerOpen: Dispatch<SetStateAction<boolean>>

  // ATTACHMENTS STORE
  chatFiles: ChatFile[]
  setChatFiles: Dispatch<SetStateAction<ChatFile[]>>

  chatImages: MessageImage[]
  setChatImages: Dispatch<SetStateAction<MessageImage[]>>

  newMessageFiles: ChatFile[]
  setNewMessageFiles: Dispatch<SetStateAction<ChatFile[]>>

  newMessageImages: MessageImage[]
  setNewMessageImages: Dispatch<SetStateAction<MessageImage[]>>

  showFilesDisplay: boolean
  setShowFilesDisplay: Dispatch<SetStateAction<boolean>>

  collectionRetrievalActive: boolean
  setCollectionRetrievalActive: Dispatch<SetStateAction<boolean>>

  collectionCreatorChat: Tables<"chats"> | null
  setCollectionCreatorChat: Dispatch<SetStateAction<Tables<"chats"> | null>>

  // RETRIEVAL STORE
  useRetrieval: boolean
  setUseRetrieval: Dispatch<SetStateAction<boolean>>

  sourceCount: number
  setSourceCount: Dispatch<SetStateAction<number>>

  // TOOL STORE
  selectedTools: Tables<"tools">[]
  setSelectedTools: Dispatch<SetStateAction<Tables<"tools">[]>>

  toolInUse: string
  setToolInUse: Dispatch<SetStateAction<string>>
}

export const useStore = create<StoreState>(set => ({
  // PROFILE STORE
  profile: null,
  setProfile: profile =>
    set(state => ({
      profile: typeof profile === "function" ? profile(state.profile) : profile
    })),

  // ITEMS STORE
  assistants: [],
  setAssistants: assistants =>
    set(state => ({
      assistants:
        typeof assistants === "function"
          ? assistants(state.assistants)
          : assistants
    })),

  collections: [],
  setCollections: collections =>
    set(state => ({
      collections:
        typeof collections === "function"
          ? collections(state.collections)
          : collections
    })),

  chats: [],
  setChats: chats =>
    set(state => ({
      chats: typeof chats === "function" ? chats(state.chats) : chats
    })),

  files: [],
  setFiles: files =>
    set(state => ({
      files: typeof files === "function" ? files(state.files) : files
    })),

  folders: [],
  setFolders: folders =>
    set(state => ({
      folders: typeof folders === "function" ? folders(state.folders) : folders
    })),

  models: [],
  setModels: models =>
    set(state => ({
      models: typeof models === "function" ? models(state.models) : models
    })),

  presets: [],
  setPresets: presets =>
    set(state => ({
      presets: typeof presets === "function" ? presets(state.presets) : presets
    })),

  prompts: [],
  setPrompts: prompts =>
    set(state => ({
      prompts: typeof prompts === "function" ? prompts(state.prompts) : prompts
    })),

  tools: [],
  setTools: tools =>
    set(state => ({
      tools: typeof tools === "function" ? tools(state.tools) : tools
    })),

  workspaces: [],
  setWorkspaces: workspaces =>
    set(state => ({
      workspaces:
        typeof workspaces === "function"
          ? workspaces(state.workspaces)
          : workspaces
    })),

  teams: [],
  setTeams: teams =>
    set(state => ({
      teams: typeof teams === "function" ? teams(state.teams) : teams
    })),

  rules: [],
  setRules: rules =>
    set(state => ({
      rules: typeof rules === "function" ? rules(state.rules) : rules
    })),

  // MODELS STORE
  envKeyMap: {},
  setEnvKeyMap: envKeyMap =>
    set(state => ({
      envKeyMap:
        typeof envKeyMap === "function" ? envKeyMap(state.envKeyMap) : envKeyMap
    })),

  availableHostedModels: [],
  setAvailableHostedModels: availableHostedModels =>
    set(state => ({
      availableHostedModels:
        typeof availableHostedModels === "function"
          ? availableHostedModels(state.availableHostedModels)
          : availableHostedModels
    })),

  availableLocalModels: [],
  setAvailableLocalModels: availableLocalModels =>
    set(state => ({
      availableLocalModels:
        typeof availableLocalModels === "function"
          ? availableLocalModels(state.availableLocalModels)
          : availableLocalModels
    })),

  availableOpenRouterModels: [],
  setAvailableOpenRouterModels: availableOpenRouterModels =>
    set(state => ({
      availableOpenRouterModels:
        typeof availableOpenRouterModels === "function"
          ? availableOpenRouterModels(state.availableOpenRouterModels)
          : availableOpenRouterModels
    })),

  // FILE PROCESSING STORE
  availableFileProcessors: [],
  setAvailableFileProcessors: availableFileProcessors =>
    set(state => ({
      availableFileProcessors:
        typeof availableFileProcessors === "function"
          ? availableFileProcessors(state.availableFileProcessors)
          : availableFileProcessors
    })),

  // WORKSPACE STORE
  selectedWorkspace: null,
  setSelectedWorkspace: workspace =>
    set(state => ({
      selectedWorkspace:
        typeof workspace === "function"
          ? workspace(state.selectedWorkspace)
          : workspace
    })),

  workspaceImages: [],
  setWorkspaceImages: workspaceImages =>
    set(state => ({
      workspaceImages:
        typeof workspaceImages === "function"
          ? workspaceImages(state.workspaceImages)
          : workspaceImages
    })),

  // PRESET STORE
  selectedPreset: null,
  setSelectedPreset: preset =>
    set(state => ({
      selectedPreset:
        typeof preset === "function" ? preset(state.selectedPreset) : preset
    })),

  // ASSISTANT STORE
  selectedAssistant: null,
  setSelectedAssistant: assistant =>
    set(state => ({
      selectedAssistant:
        typeof assistant === "function"
          ? assistant(state.selectedAssistant)
          : assistant
    })),

  assistantImages: [],
  setAssistantImages: assistantImages =>
    set(state => ({
      assistantImages:
        typeof assistantImages === "function"
          ? assistantImages(state.assistantImages)
          : assistantImages
    })),

  openaiAssistants: [],
  setOpenaiAssistants: openaiAssistants =>
    set(state => ({
      openaiAssistants:
        typeof openaiAssistants === "function"
          ? openaiAssistants(state.openaiAssistants)
          : openaiAssistants
    })),

  // PASSIVE CHAT STORE
  userInput: "",
  setUserInput: input =>
    set(state => ({
      userInput: typeof input === "function" ? input(state.userInput) : input
    })),

  chatSettings: null,
  setChatSettings: settings =>
    set(state => ({
      chatSettings:
        typeof settings === "function" ? settings(state.chatSettings) : settings
    })),

  selectedChat: null,
  setSelectedChat: chat =>
    set(state => ({
      selectedChat: typeof chat === "function" ? chat(state.selectedChat) : chat
    })),

  chatFileItems: [],
  setChatFileItems: items =>
    set(state => ({
      chatFileItems:
        typeof items === "function" ? items(state.chatFileItems) : items
    })),

  chatFileHighlights: {},
  setChatFileHighlights: highlights =>
    set(state => ({
      chatFileHighlights:
        typeof highlights === "function"
          ? highlights(state.chatFileHighlights)
          : highlights
    })),

  selectedCollectionCreatorChat: null,
  setSelectedCollectionCreatorChat: chat =>
    set(state => ({
      selectedCollectionCreatorChat:
        typeof chat === "function"
          ? chat(state.selectedCollectionCreatorChat)
          : chat
    })),

  // ACTIVE CHAT STORE
  isGenerating: false,
  setIsGenerating: isGenerating =>
    set(state => ({
      isGenerating:
        typeof isGenerating === "function"
          ? isGenerating(state.isGenerating)
          : isGenerating
    })),

  firstTokenReceived: false,
  setFirstTokenReceived: received =>
    set(state => ({
      firstTokenReceived:
        typeof received === "function"
          ? received(state.firstTokenReceived)
          : received
    })),

  abortController: null,
  setAbortController: controller =>
    set(state => ({
      abortController:
        typeof controller === "function"
          ? controller(state.abortController)
          : controller
    })),

  scrollHeight: {
    pageId: "",
    scrollTop: 0
  },

  // CHAT INPUT COMMAND STORE
  isPromptPickerOpen: false,
  setIsPromptPickerOpen: isOpen =>
    set(state => ({
      isPromptPickerOpen:
        typeof isOpen === "function" ? isOpen(state.isPromptPickerOpen) : isOpen
    })),

  slashCommand: "",
  setSlashCommand: command =>
    set(state => ({
      slashCommand:
        typeof command === "function" ? command(state.slashCommand) : command
    })),

  isFilePickerOpen: false,
  setIsFilePickerOpen: isOpen =>
    set(state => ({
      isFilePickerOpen:
        typeof isOpen === "function" ? isOpen(state.isFilePickerOpen) : isOpen
    })),

  hashtagCommand: "",
  setHashtagCommand: command =>
    set(state => ({
      hashtagCommand:
        typeof command === "function" ? command(state.hashtagCommand) : command
    })),

  isToolPickerOpen: false,
  setIsToolPickerOpen: isOpen =>
    set(state => ({
      isToolPickerOpen:
        typeof isOpen === "function" ? isOpen(state.isToolPickerOpen) : isOpen
    })),

  toolCommand: "",
  setToolCommand: command =>
    set(state => ({
      toolCommand:
        typeof command === "function" ? command(state.toolCommand) : command
    })),

  focusPrompt: false,
  setFocusPrompt: focus =>
    set(state => ({
      focusPrompt:
        typeof focus === "function" ? focus(state.focusPrompt) : focus
    })),

  focusFile: false,
  setFocusFile: focus =>
    set(state => ({
      focusFile: typeof focus === "function" ? focus(state.focusFile) : focus
    })),

  focusTool: false,
  setFocusTool: focus =>
    set(state => ({
      focusTool: typeof focus === "function" ? focus(state.focusTool) : focus
    })),

  focusAssistant: false,
  setFocusAssistant: focus =>
    set(state => ({
      focusAssistant:
        typeof focus === "function" ? focus(state.focusAssistant) : focus
    })),

  atCommand: "",
  setAtCommand: command =>
    set(state => ({
      atCommand:
        typeof command === "function" ? command(state.atCommand) : command
    })),

  isAssistantPickerOpen: false,
  setIsAssistantPickerOpen: isOpen =>
    set(state => ({
      isAssistantPickerOpen:
        typeof isOpen === "function"
          ? isOpen(state.isAssistantPickerOpen)
          : isOpen
    })),

  // ATTACHMENTS STORE
  chatFiles: [],
  setChatFiles: files =>
    set(state => ({
      chatFiles: typeof files === "function" ? files(state.chatFiles) : files
    })),

  chatImages: [],
  setChatImages: images =>
    set(state => ({
      chatImages:
        typeof images === "function" ? images(state.chatImages) : images
    })),

  newMessageFiles: [],
  setNewMessageFiles: files =>
    set(state => ({
      newMessageFiles:
        typeof files === "function" ? files(state.newMessageFiles) : files
    })),

  newMessageImages: [],
  setNewMessageImages: images =>
    set(state => ({
      newMessageImages:
        typeof images === "function" ? images(state.newMessageImages) : images
    })),

  showFilesDisplay: false,
  setShowFilesDisplay: show =>
    set(state => ({
      showFilesDisplay:
        typeof show === "function" ? show(state.showFilesDisplay) : show
    })),

  collectionRetrievalActive: false,
  setCollectionRetrievalActive: active =>
    set(state => ({
      collectionRetrievalActive:
        typeof active === "function"
          ? active(state.collectionRetrievalActive)
          : active
    })),

  collectionCreatorChat: null,
  setCollectionCreatorChat: chat =>
    set(state => ({
      collectionCreatorChat:
        typeof chat === "function" ? chat(state.collectionCreatorChat) : chat
    })),

  // RETRIEVAL STORE
  useRetrieval: true,
  setUseRetrieval: use =>
    set(state => ({
      useRetrieval: typeof use === "function" ? use(state.useRetrieval) : use
    })),

  sourceCount: 4,
  setSourceCount: count =>
    set(state => ({
      sourceCount:
        typeof count === "function" ? count(state.sourceCount) : count
    })),

  // TOOL STORE
  selectedTools: [],
  setSelectedTools: tools =>
    set(state => ({
      selectedTools:
        typeof tools === "function" ? tools(state.selectedTools) : tools
    })),

  toolInUse: "none",
  setToolInUse: tool =>
    set(state => ({
      toolInUse: typeof tool === "function" ? tool(state.toolInUse) : tool
    }))
}))

interface MessageStoreState {
  chatMessages: ChatMessage[]
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
}

export const useMessageStore = create<MessageStoreState>(set => ({
  chatMessages: [],
  setChatMessages: messages =>
    set(state => ({
      chatMessages:
        typeof messages === "function" ? messages(state.chatMessages) : messages
    }))
}))
