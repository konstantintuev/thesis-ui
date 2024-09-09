import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RULE_NAME_MAX, RULE_WEIGHT_MAX } from "@/db/limits"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { Button } from "@/components/ui/button"
import { text2Query } from "@/lib/rule-processing"
import { toast } from "sonner"
import { IconChevronRight } from "@tabler/icons-react"
import { FC } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { getBasicRuleInstructions } from "@/components/sidebar/items/rules/rule-instructions"

export function extractWeight(input: string): number {
  if (input === "") {
    return 0
  }
  if (input.includes("%")) {
    return parseFloat(input.slice(0, -1))
  }
  return parseFloat(input)
}

function isJson(it: string) {
  try {
    JSON.parse(it)
  } catch (e) {
    return false
  }
  return true
}

export const RuleInput: FC<{
  useExpandedSheet: boolean
  setUseExpandedSheet: React.Dispatch<React.SetStateAction<boolean>>
  name: string
  setName: React.Dispatch<React.SetStateAction<string>>
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>
  weight: string
  setWeight: React.Dispatch<React.SetStateAction<string>>
  comparison: string
  setComparison: React.Dispatch<React.SetStateAction<string>>
}> = ({
  useExpandedSheet,
  setUseExpandedSheet,
  name,
  setName,
  setIsTyping,
  weight,
  setWeight,
  comparison,
  setComparison
}): JSX.Element => {
  let comparisonIsJson = isJson(comparison)

  return (
    <div>
      <Collapsible
        className="pt-2"
        open={useExpandedSheet}
        onOpenChange={setUseExpandedSheet}
      >
        <CollapsibleTrigger className="flex w-full justify-center hover:opacity-50">
          <div className="mb-4 flex items-center font-bold">
            <div
              className={
                useExpandedSheet
                  ? "mb-4 pb-2 text-4xl font-bold text-gray-900"
                  : "mr-1"
              }
            >
              Instructions for Writing Rules for Ranking Files
            </div>
            {!useExpandedSheet && <IconChevronRight size={20} stroke={3} />}
          </div>
        </CollapsibleTrigger>

        {useExpandedSheet && <hr className="mb-4 border-t-2 border-gray-200" />}

        <div className="flex flex-wrap">
          <CollapsibleContent className="h-[calc(100vh-18rem)] flex-1 overflow-y-auto">
            {getBasicRuleInstructions()}
          </CollapsibleContent>

          {useExpandedSheet && (
            <div className="mx-6 hidden border-l border-gray-300 lg:block"></div>
          )}

          <div className="flex w-[400px] flex-col gap-2">
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
                        (e.target.value.includes("%") && value !== ""
                          ? "%"
                          : "")
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
              <Label>{`Rule ${comparisonIsJson ? "JSON" : "Plain Text"}`}</Label>

              <TextareaAutosize
                placeholder={`Rule ${comparisonIsJson ? "json" : "plain text"}...`}
                value={comparison}
                onValueChange={setComparison}
                minRows={6}
                maxRows={150}
                onCompositionStart={() => setIsTyping(true)}
                onCompositionEnd={() => setIsTyping(false)}
              />
            </div>

            {!comparisonIsJson && (
              <div className="my-1">
                <Button
                  onClick={async () => {
                    try {
                      let res = await text2Query(comparison)
                      setComparison(JSON.stringify(res, null, 2))
                    } catch (e) {
                      // @ts-ignore
                      toast.error(e?.message ?? "Unknown error")
                    }
                  }}
                >
                  Generate Rule JSON from Plain Text
                </Button>
              </div>
            )}
          </div>
        </div>
      </Collapsible>
    </div>
  )
}
