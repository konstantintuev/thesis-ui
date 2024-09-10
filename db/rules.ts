import { supabase } from "@/lib/supabase/browser-client"
import { Database, Tables, TablesInsert, TablesUpdate } from "@/supabase/types"

export const getRules = async () => {
  const { data: rules, error } = await supabase
    .from("rules")
    .select("*")
    .order("created_at", { ascending: false })
  if (!rules) {
    throw new Error(error.message)
  }

  return rules
}

export const createRule = async (rule: TablesInsert<"rules">) => {
  if (typeof rule.comparison === "string" && rule.type === "basic") {
    rule.comparison = JSON.parse(rule.comparison)
  }
  const { data: createdRule, error } = await supabase
    .from("rules")
    .insert([rule])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }
  return createdRule
}

export const updateRule = async (
  ruleId: string,
  rule: TablesUpdate<"rules">
) => {
  if (typeof rule.comparison === "string" && rule.type === "basic") {
    rule.comparison = JSON.parse(rule.comparison)
  }

  const { data: updatedRule, error } = await supabase
    .from("rules")
    .update(rule)
    .eq("id", ruleId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedRule
}

export const deleteRule = async (ruleId: string) => {
  const response = await supabase
    .from("rules")
    .delete()
    .eq("id", ruleId)
    .select("*")

  if (!response.data || response.data?.length === 0 || response.error) {
    return false
  }

  return true
}

export const rankFiles = async (
  args: Database["public"]["Functions"]["rank_files"]["Args"]
) => {
  const response = await supabase.rpc("rank_files", args)

  if (response.error) {
    return []
  }
  return response.data
}
