import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { TablesInsert } from "@/supabase/types"
import { FC, useState } from "react"
import { useStore } from "@/context/context"
import {
  extractWeight,
  BasicRuleInput
} from "@/components/sidebar/items/rules/basic-rule-input"
import { RuleType } from "@/types/rules"
import { AdvancedRuleInput } from "@/components/sidebar/items/rules/advanced-rule-input"

interface CreateRuleProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateRule: FC<CreateRuleProps> = ({ isOpen, onOpenChange }) => {
  const { profile } = useStore()
  const [name, setName] = useState("")
  const [weight, setWeight] = useState<string>("")
  const [comparison, setComparison] = useState<string>("")
  const [ruleType, setRuleType] = useState<RuleType>("basic")
  const [isTyping, setIsTyping] = useState(false)
  const [ruleTestResults, setRuleTestResults] = useState<string | undefined>()

  if (!profile) return null

  return (
    <SidebarCreateItem
      contentType="rules"
      isOpen={isOpen}
      isTyping={isTyping}
      onOpenChange={onOpenChange}
      createState={
        {
          user_id: profile.user_id,
          name,
          comparison,
          type: ruleType,
          weight: extractWeight(weight) / 100
        } as TablesInsert<"rules">
      }
      renderInputs={(useExpandedSheet, setUseExpandedSheet) =>
        ruleType === "basic"
          ? BasicRuleInput({
              name,
              setName,
              setIsTyping,
              weight,
              setWeight,
              comparison,
              setComparison,
              useExpandedSheet,
              setUseExpandedSheet,
              ruleType,
              setRuleType,
              ruleTestResults,
              setRuleTestResults
            })
          : AdvancedRuleInput({
              name,
              setName,
              setIsTyping,
              weight,
              setWeight,
              comparison,
              setComparison,
              useExpandedSheet,
              setUseExpandedSheet,
              ruleType,
              setRuleType
            })
      }
    />
  )
}
