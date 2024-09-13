import { supabase } from "@/lib/supabase/browser-client"
import { Database, Tables, TablesInsert, TablesUpdate } from "@/supabase/types"
import { SupabaseClient } from "@supabase/supabase-js"

export const getCollectionById = async (collectionId: string) => {
  const { data: collection, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", collectionId)
    .single()

  if (!collection) {
    throw new Error(error.message)
  }

  return collection
}

export const getCollectionWorkspacesByWorkspaceId = async (
  workspaceId: string
) => {
  const { data: collectionWorkspace, error } = await supabase
    .from("collection_workspaces")
    .select(
      `
      *
    `
    )
  let { data: collections, error: collectionsError } = await supabase
    .from("collections")
    .select(
      `
      *
    `
    )
    .eq("hidden", false)

  if (error || collectionsError) {
    throw new Error((error ?? collectionsError)?.message)
  }

  collections =
    collections
      ?.map(item => {
        let workspacesForCollection = collectionWorkspace
          ?.filter(fw => fw.collection_id === item.id)
          ?.map(it => it.workspace_id)
        // collection is not know to the user
        if (workspacesForCollection.length === 0) {
          // @ts-ignore
          item.from_team = true
          return item
          // ... or is in the right workspace
        } else if (workspacesForCollection.includes(workspaceId)) {
          return item
        }
        return undefined
      })
      ?.filter(item => !!item) ?? null

  return collections
}

export const getCollectionWorkspacesByCollectionId = async (
  collectionId: string
) => {
  const { data: collection, error } = await supabase
    .from("collections")
    .select(
      `
      id, 
      name, 
      workspaces (*)
    `
    )
    .eq("id", collectionId)
    .single()

  if (!collection) {
    throw new Error(error.message)
  }

  return collection
}

export const createCollection = async (
  collection: TablesInsert<"collections">,
  workspace_id: string,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: createdCollection, error } = await (
    supabaseInstance ?? supabase
  )
    .from("collections")
    .insert([collection])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await createCollectionWorkspace(
    {
      user_id: createdCollection.user_id,
      collection_id: createdCollection.id,
      workspace_id
    },
    supabaseInstance
  )

  return createdCollection
}

// A chat is a creator of a file collection if it can supply it with files (e.g. file retriever chat)
export const createChatCollectionCreator = async (
  collection: TablesInsert<"chat_collection_creator">,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: createdChatCollectionCreator, error } = await (
    supabaseInstance ?? supabase
  )
    .from("chat_collection_creator")
    .insert([collection])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdChatCollectionCreator
}

export const getChatCollectionCreator = async (
  chatId: string,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: chatCollectionCreator, error } = await (
    supabaseInstance ?? supabase
  )
    .from("chat_collection_creator")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return chatCollectionCreator
}

export const getChatCollectionCreatorByCollection = async (
  collectionId: string,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: chatCollectionCreator, error } = await (
    supabaseInstance ?? supabase
  )
    .from("chat_collection_creator")
    .select("*")
    .eq("collection_id", collectionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return chatCollectionCreator
}

// A chat is a consumer of a file collection if it can use its files dynamically to RAG them
export const createChatCollectionConsumer = async (
  collection: TablesInsert<"chat_collection_consumer">,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: createdChatCollectionConsumer, error } = await (
    supabaseInstance ?? supabase
  )
    .from("chat_collection_consumer")
    .insert([collection])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdChatCollectionConsumer
}

export const getChatCollectionConsumer = async (
  chatId: string,
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: chatCollectionConsumer, error } = await (
    supabaseInstance ?? supabase
  )
    .from("chat_collection_consumer")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return chatCollectionConsumer
}

export const createCollections = async (
  collections: TablesInsert<"collections">[],
  workspace_id: string
) => {
  const { data: createdCollections, error } = await supabase
    .from("collections")
    .insert(collections)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  await createCollectionWorkspaces(
    createdCollections.map(collection => ({
      user_id: collection.user_id,
      collection_id: collection.id,
      workspace_id
    }))
  )

  return createdCollections
}

export const createCollectionWorkspace = async (
  item: {
    user_id: string
    collection_id: string
    workspace_id: string
  },
  supabaseInstance?: SupabaseClient<Database>
) => {
  const { data: createdCollectionWorkspace, error } = await (
    supabaseInstance ?? supabase
  )
    .from("collection_workspaces")
    .insert([item])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdCollectionWorkspace
}

export const createCollectionWorkspaces = async (
  items: { user_id: string; collection_id: string; workspace_id: string }[]
) => {
  const { data: createdCollectionWorkspaces, error } = await supabase
    .from("collection_workspaces")
    .insert(items)
    .select("*")

  if (error) throw new Error(error.message)

  return createdCollectionWorkspaces
}

export const updateCollection = async (
  collectionId: string,
  collection: TablesUpdate<"collections">
) => {
  const { data: updatedCollection, error } = await supabase
    .from("collections")
    .update(collection)
    .eq("id", collectionId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedCollection
}

export const deleteCollection = async (collectionId: string) => {
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteCollectionWorkspace = async (
  collectionId: string,
  workspaceId: string
) => {
  const { error } = await supabase
    .from("collection_workspaces")
    .delete()
    .eq("collection_id", collectionId)
    .eq("workspace_id", workspaceId)

  if (error) throw new Error(error.message)

  return true
}
