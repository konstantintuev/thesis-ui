import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RULE_NAME_MAX, RULE_WEIGHT_MAX } from "@/db/limits"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { Button } from "@/components/ui/button"
import { IconRepeat } from "@tabler/icons-react"
import { FC } from "react"
import { RuleType } from "@/types/rules"

export function extractWeight(input: string): number {
  if (input === "") {
    return 0
  }
  if (input.includes("%")) {
    return parseFloat(input.slice(0, -1))
  }
  return parseFloat(input)
}

export const AdvancedRuleInput: FC<{
  useExpandedSheet: boolean
  setUseExpandedSheet: React.Dispatch<React.SetStateAction<boolean>>
  name: string
  setName: React.Dispatch<React.SetStateAction<string>>
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>
  weight: string
  setWeight: React.Dispatch<React.SetStateAction<string>>
  comparison: string
  setComparison: React.Dispatch<React.SetStateAction<string>>
  ruleType: RuleType
  setRuleType?: React.Dispatch<React.SetStateAction<RuleType>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
}> = ({
  useExpandedSheet,
  setUseExpandedSheet,
  name,
  setName,
  setIsTyping,
  weight,
  setWeight,
  comparison,
  setComparison,
  ruleType,
  setRuleType,
  isLoading,
  setIsLoading
}): JSX.Element => {
  return (
    <div className={`flex flex-col gap-2`}>
      {setRuleType && (
        <div className="space-y-1.5">
          <Label>Switch to Metadata-based Rules</Label>

          <Button
            disabled={isLoading}
            className="flex h-full items-center space-x-2"
            variant="secondary"
          >
            <IconRepeat size={26} onClick={() => setRuleType("basic")} />
          </Button>
        </div>
      )}

      <div className="space-y-1">
        <Label>Name</Label>

        <Input
          placeholder="Rule name..."
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={RULE_NAME_MAX}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
        />
      </div>

      <div className="space-y-1">
        <Label>Weight</Label>

        <Input
          placeholder="Rule weight from 0% to 100%..."
          type="text"
          value={weight}
          onChange={e => {
            const value = e.target.value.replace(/[^\d.]/g, "")
            if (
              value === "" ||
              (parseFloat(value) >= 0 && parseFloat(value) <= 100)
            ) {
              setWeight(
                value +
                  (e.target.value.includes("%") && value !== "" ? "%" : "")
              )
            }
          }}
          onBlur={() => {
            if (weight === "" || weight === "%") {
              return
            }
            if (!weight.endsWith("%")) {
              setWeight(`${weight}%`)
            }
          }}
          maxLength={RULE_WEIGHT_MAX}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
        />
      </div>

      <div className="space-y-1">
        <Label>{`Rule using a YES/NO Question`}</Label>

        <TextareaAutosize
          placeholder={`Rule question...`}
          value={comparison}
          onValueChange={setComparison}
          minRows={6}
          maxRows={150}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
        />
        <p className="mt-2 text-sm text-gray-700">
          {`Rules using a YES/NO question are expensive as each retrieved document is verified against them!`}
        </p>
      </div>
    </div>
  )
}
