import { Tables } from "@/supabase/types"

export interface ChatMessage {
  profile: Tables<"profiles_public_view">
  message: Tables<"messages">
  fileItems: string[]
}
