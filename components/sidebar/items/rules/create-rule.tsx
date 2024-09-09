import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { ChatbotUIContext } from "@/context/context"
import { TablesInsert } from "@/supabase/types"
import { FC, useContext, useState } from "react"
import {
  extractWeight,
  RuleInput
} from "@/components/sidebar/items/rules/rules"

interface CreateRuleProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateRule: FC<CreateRuleProps> = ({ isOpen, onOpenChange }) => {
  const { profile } = useContext(ChatbotUIContext)
  const [name, setName] = useState("")
  const [weight, setWeight] = useState<string>("")
  const [comparison, setComparison] = useState<string>("")
  const [isTyping, setIsTyping] = useState(false)

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
          weight: extractWeight(weight) / 100
        } as TablesInsert<"rules">
      }
      renderInputs={(useExpandedSheet, setUseExpandedSheet) =>
        RuleInput({
          name,
          setName,
          setIsTyping,
          weight,
          setWeight,
          comparison,
          setComparison,
          useExpandedSheet,
          setUseExpandedSheet
        })
      }
    />
  )
}
