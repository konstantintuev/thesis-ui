import { Tables } from "@/supabase/types"
import { ChatPayload, isModelIdFileRetriever, MessageImage } from "@/types"
import { encode } from "gpt-tokenizer"
import { getFilesById } from "@/db/files"

const buildBasePrompt = (
  prompt: string,
  profileContext: string,
  workspaceInstructions: string,
  assistant: Tables<"assistants"> | null
) => {
  let fullPrompt = ""

  if (assistant) {
    fullPrompt += `<INJECT ROLE>\nYou are not an AI. You are ${assistant.name}.\n</INJECT ROLE>\n\n`
  }

  fullPrompt += `Today is ${new Date().toLocaleDateString()}.\n\n`

  if (profileContext) {
    fullPrompt += `User Info:\n${profileContext}\n\n`
  }

  if (workspaceInstructions) {
    fullPrompt += `System Instructions:\n${workspaceInstructions}\n\n`
  }

  fullPrompt += `User Instructions:\n${prompt}`

  return fullPrompt
}

export async function buildFinalMessages(
  payload: ChatPayload,
  profile: Tables<"profiles">,
  chatImages: MessageImage[]
) {
  const {
    chatSettings,
    workspaceInstructions,
    chatMessages,
    assistant,
    messageFileItems,
    chatFileItems
  } = payload

  const BUILT_PROMPT = buildBasePrompt(
    chatSettings.prompt,
    chatSettings.includeProfileContext ? profile.profile_context || "" : "",
    chatSettings.includeWorkspaceInstructions ? workspaceInstructions : "",
    assistant
  )

  const CHUNK_SIZE = chatSettings.contextLength
  const PROMPT_TOKENS = encode(chatSettings.prompt).length

  let remainingTokens = CHUNK_SIZE - PROMPT_TOKENS

  let usedTokens = 0
  usedTokens += PROMPT_TOKENS

  // Add retrieval text to previous message - NO, WTF WAS HE THINKING
  const addRAGTextToPreviousMsg = false
  let processedChatMessages = chatMessages
  if (addRAGTextToPreviousMsg) {
    processedChatMessages = await Promise.all(
      chatMessages.map(async (chatMessage, index) => {
        const nextChatMessage = chatMessages[index + 1]

        if (nextChatMessage === undefined) {
          return chatMessage
        }

        const nextChatMessageFileItems = nextChatMessage.fileItems

        if (nextChatMessageFileItems.length > 0) {
          const findFileItems = nextChatMessageFileItems
            .map(fileItemId =>
              chatFileItems.find(chatFileItem => chatFileItem.id === fileItemId)
            )
            .filter(item => item !== undefined) as Tables<"file_items">[]

          const retrievalText = await buildRetrievalText(findFileItems)

          return {
            message: {
              ...chatMessage.message,
              content:
                `${chatMessage.message.content}\n\n${retrievalText}` as string
            },
            profile: chatMessage.profile,
            fileItems: []
          }
        }

        return chatMessage
      })
    )
  }

  let finalMessages = []

  if (isModelIdFileRetriever(chatSettings.model)) {
    finalMessages = processedChatMessages.map(msg => msg.message)
  } else {
    for (let i = processedChatMessages.length - 1; i >= 0; i--) {
      const message = processedChatMessages[i].message
      const messageTokens = encode(message.content).length

      if (messageTokens <= remainingTokens) {
        remainingTokens -= messageTokens
        usedTokens += messageTokens
        finalMessages.unshift(message)
      } else {
        break
      }
    }
  }

  let tempSystemMessage: Tables<"messages"> = {
    chat_id: "",
    assistant_id: null,
    content: BUILT_PROMPT,
    created_at: "",
    id: processedChatMessages.length + "",
    image_paths: [],
    model: payload.chatSettings.model,
    role: "system",
    sequence_number: processedChatMessages.length,
    updated_at: "",
    user_id: "",
    rewritten_message: null
  }

  finalMessages.unshift(tempSystemMessage)

  finalMessages = finalMessages.map(message => {
    let content

    if (message.image_paths.length > 0) {
      content = [
        {
          type: "text",
          text: message.content
        },
        ...message.image_paths.map(path => {
          let formedUrl = ""

          if (path.startsWith("data")) {
            formedUrl = path
          } else {
            const chatImage = chatImages.find(image => image.path === path)

            if (chatImage) {
              formedUrl = chatImage.base64
            }
          }

          return {
            type: "image_url",
            image_url: {
              url: formedUrl
            }
          }
        })
      ]
    } else {
      content = message.content
    }

    return {
      role: message.role,
      content,
      rewrittenMessage: message.rewritten_message
    }
  })

  if (
    !isModelIdFileRetriever(chatSettings.model) &&
    messageFileItems.length > 0
  ) {
    const retrievalText = await buildRetrievalText(messageFileItems)

    finalMessages[finalMessages.length - 1] = {
      ...finalMessages[finalMessages.length - 1],
      content: `${
        finalMessages[finalMessages.length - 1].content
      }\n\n${retrievalText}`
    }
  }

  return finalMessages
}

const retrievalTextIntro =
  "You may use the following documents if needed to answer the user's question. If you don't know the answer, say \"I don't know.\""

/* I have added info about the document segments' origin - which document they come from.
 * This is because in cross-domain questions requiring multiple sources (e.g. which brakes work with the motor)
 *   the LLM gets confused about the fused specs of brakes and motor in the same message and
 *   assumes everything belongs together as weird motor/brake hybrid specification.
 * */
async function buildRetrievalText(fileItems: Tables<"file_items">[]) {
  // Group by file name for cross domain questions
  let groupedFiles = fileItems.reduce(
    (result, item) => {
      const groupKey = item.file_id
      if (!result[groupKey]) {
        result[groupKey] = []
      }
      result[groupKey].push(item)

      return result
    },
    {} as Record<string, Tables<"file_items">[]>
  )
  const fileIds = Object.keys(groupedFiles)
  let files = await getFilesById(fileIds)
  for (const fileId of fileIds) {
    let file = files.find(it => it.id === fileId)
    // I can't use an index as sql reorders the files sometimes
    if (file) {
      groupedFiles[file.name] = groupedFiles[fileId]
      delete groupedFiles[fileId]
    }
  }

  const retrievalText = Object.entries(groupedFiles)
    .map(
      file =>
        "<BEGIN DOCUMENT>\n\n" +
        `<DOCUMENT TITLE>${file[0]}</DOCUMENT TITLE>\n\n` +
        file[1]
          .map(
            item =>
              `<BEGIN DOCUMENT SEGMENT>\n${item.content}\n</END DOCUMENT SEGMENT>`
          )
          .join("\n") +
        "\n\n</END DOCUMENT>"
    )
    .join("\n\n")

  return `${retrievalTextIntro}"\n\n${retrievalText}`
}

export function removeRetrievalText(content: string) {
  const startIndex = content.indexOf(retrievalTextIntro)
  // No RAG text
  if (startIndex === -1) {
    return content
  }
  return content.substring(0, startIndex)
}

export function removeRetrievalTextFromMessages(
  messages: Tables<"messages">[]
) {
  return messages.map((message, index) => {
    if (index === messages.length - 1) {
      // Keep RAG of last message
      return message
    }
    message.content = removeRetrievalText(message.content)
    return message
  })
}

export async function buildGoogleGeminiFinalMessages(
  payload: ChatPayload,
  profile: Tables<"profiles">,
  messageImageFiles: MessageImage[]
) {
  const { chatSettings, workspaceInstructions, chatMessages, assistant } =
    payload

  const BUILT_PROMPT = buildBasePrompt(
    chatSettings.prompt,
    chatSettings.includeProfileContext ? profile.profile_context || "" : "",
    chatSettings.includeWorkspaceInstructions ? workspaceInstructions : "",
    assistant
  )

  let finalMessages = []

  let usedTokens = 0
  const CHUNK_SIZE = chatSettings.contextLength
  const PROMPT_TOKENS = encode(chatSettings.prompt).length
  let REMAINING_TOKENS = CHUNK_SIZE - PROMPT_TOKENS

  usedTokens += PROMPT_TOKENS

  for (let i = chatMessages.length - 1; i >= 0; i--) {
    const message = chatMessages[i].message
    const messageTokens = encode(message.content).length

    if (messageTokens <= REMAINING_TOKENS) {
      REMAINING_TOKENS -= messageTokens
      usedTokens += messageTokens
      finalMessages.unshift(message)
    } else {
      break
    }
  }

  let tempSystemMessage: Tables<"messages"> = {
    chat_id: "",
    assistant_id: null,
    content: BUILT_PROMPT,
    created_at: "",
    id: chatMessages.length + "",
    image_paths: [],
    model: payload.chatSettings.model,
    role: "system",
    sequence_number: chatMessages.length,
    updated_at: "",
    user_id: "",
    rewritten_message: null
  }

  finalMessages.unshift(tempSystemMessage)

  let GOOGLE_FORMATTED_MESSAGES = []

  if (chatSettings.model === "gemini-pro") {
    GOOGLE_FORMATTED_MESSAGES = [
      {
        role: "user",
        parts: finalMessages[0].content
      },
      {
        role: "model",
        parts: "I will follow your instructions."
      }
    ]

    for (let i = 1; i < finalMessages.length; i++) {
      GOOGLE_FORMATTED_MESSAGES.push({
        role: finalMessages[i].role === "user" ? "user" : "model",
        parts: finalMessages[i].content as string
      })
    }

    return GOOGLE_FORMATTED_MESSAGES
  } else if ((chatSettings.model = "gemini-pro-vision")) {
    // Gemini Pro Vision doesn't currently support messages
    async function fileToGenerativePart(file: File) {
      const base64EncodedDataPromise = new Promise(resolve => {
        const reader = new FileReader()

        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result.split(",")[1])
          }
        }

        reader.readAsDataURL(file)
      })

      return {
        inlineData: {
          data: await base64EncodedDataPromise,
          mimeType: file.type
        }
      }
    }

    let prompt = ""

    for (let i = 0; i < finalMessages.length; i++) {
      prompt += `${finalMessages[i].role}:\n${finalMessages[i].content}\n\n`
    }

    const files = messageImageFiles.map(file => file.file)
    const imageParts = await Promise.all(
      files.map(file =>
        file ? fileToGenerativePart(file) : Promise.resolve(null)
      )
    )

    // FIX: Hacky until chat messages are supported
    return [
      {
        prompt,
        imageParts
      }
    ]
  }

  return finalMessages
}
