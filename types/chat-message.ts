import { Tables } from "@/supabase/types"

export interface ChatMessage {
  profile: Tables<"profiles_public_view">
  message: Omit<Tables<"messages">, "rewritten_message"> & {
    rewritten_message?: string | null
  }
  fileItems: string[]
}
