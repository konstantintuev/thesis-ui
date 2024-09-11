import { Tables, TablesUpdate } from "@/supabase/types"
import { IconFilterCheck, IconFilterStar } from "@tabler/icons-react"
import { FC, useEffect, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"
import {
  extractWeight,
  BasicRuleInput
} from "@/components/sidebar/items/rules/basic-rule-input"
import { RuleType } from "@/types/rules"
import { AdvancedRuleInput } from "@/components/sidebar/items/rules/advanced-rule-input"

interface PromptItemProps {
  rule: Tables<"rules">
}

export const RuleItem: FC<PromptItemProps> = ({ rule }) => {
  const [name, setName] = useState(rule.name)
  const [weight, setWeight] = useState<string>(
    (rule.weight * 100).toString() + "%"
  )
  const [comparison, setComparison] = useState<string>(
    rule.type === "basic"
      ? JSON.stringify(rule.comparison, null, 2)
      : (rule.comparison as string)
  )
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [ruleTestResults, setRuleTestResults] = useState<string | undefined>()
  return (
    <SidebarItem
      item={rule}
      isTyping={isTyping || isLoading}
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
        rule.type === "basic"
          ? BasicRuleInput({
              name,
              setName,
              setIsTyping,
              weight,
              setWeight,
              comparison,
              setComparison,
              useExpandedSheet: renderState.useExpandedSheet,
              setUseExpandedSheet: renderState.setUseExpandedSheet,
              ruleType: rule.type as RuleType,
              ruleTestResults,
              setRuleTestResults,
              isLoading,
              setIsLoading
            })
          : AdvancedRuleInput({
              name,
              setName,
              setIsTyping,
              weight,
              setWeight,
              comparison,
              setComparison,
              useExpandedSheet: renderState.useExpandedSheet,
              setUseExpandedSheet: renderState.setUseExpandedSheet,
              ruleType: rule.type as RuleType,
              isLoading,
              setIsLoading
            })
      }
    />
  )
}
