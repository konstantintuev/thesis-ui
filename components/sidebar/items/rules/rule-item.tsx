import { Tables, TablesUpdate } from "@/supabase/types"
import { IconFilterCheck, IconFilterStar } from "@tabler/icons-react"
import { FC, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"
import {
  extractWeight,
  RuleInput
} from "@/components/sidebar/items/rules/rules"

interface PromptItemProps {
  rule: Tables<"rules">
}

export const RuleItem: FC<PromptItemProps> = ({ rule }) => {
  const [name, setName] = useState(rule.name)
  const [weight, setWeight] = useState<string>(
    (rule.weight * 100).toString() + "%"
  )
  const [comparison, setComparison] = useState<string>(
    JSON.stringify(rule.comparison, null, 2)
  )
  const [isTyping, setIsTyping] = useState(false)
  return (
    <SidebarItem
      item={rule}
      isTyping={isTyping}
      contentType="rules"
      icon={
        rule.type === "basic" ? (
          <IconFilterCheck size={30} />
        ) : (
          <IconFilterStar size={30} />
        )
      }
      updateState={
        {
          name,
          weight: extractWeight(weight) / 100,
          comparison
        } as TablesUpdate<"rules">
      }
      renderInputs={renderState =>
        RuleInput({
          name,
          setName,
          setIsTyping,
          weight,
          setWeight,
          comparison,
          setComparison,
          useExpandedSheet: renderState.useExpandedSheet,
          setUseExpandedSheet: renderState.setUseExpandedSheet
        })
      }
    />
  )
}