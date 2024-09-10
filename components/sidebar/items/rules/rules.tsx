import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RULE_NAME_MAX, RULE_WEIGHT_MAX } from "@/db/limits"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { Button } from "@/components/ui/button"
import { text2Query } from "@/lib/rule-processing"
import { toast } from "sonner"
import { IconChevronRight } from "@tabler/icons-react"
import { FC, useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { getBasicRuleInstructions } from "@/components/sidebar/items/rules/rule-instructions"
import { createRule, deleteRule, rankFiles } from "@/db/rules"
import { TablesInsert } from "@/supabase/types"

export function extractWeight(input: string): number {
  if (input === "") {
    return 0
  }
  if (input.includes("%")) {
    return parseFloat(input.slice(0, -1))
  }
  return parseFloat(input)
}

const jsonLikeRegex = /^[\{\[\s]*(".*?"\s*:\s*.*?\s*,?\s*)*[\}\]\s]*$/s
function isJson(it: string) {
  if (it.length === 0) return true

  return jsonLikeRegex.test(it)
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

  const [ruleTestResults, setRuleTestResults] = useState<string | undefined>()

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

        <div
          className={`grid size-full ${useExpandedSheet ? "grid-cols-[2fr_auto_1fr]" : "grid-cols-1"}`}
        >
          <CollapsibleContent className="overflow-y-scroll p-4">
            {getBasicRuleInstructions()}
          </CollapsibleContent>

          {useExpandedSheet && (
            <div className="mx-6 block border-l border-gray-300"></div>
          )}

          <div className={`flex flex-col gap-2 overflow-y-scroll p-4`}>
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

            <div className="my-1">
              <Button
                onClick={async () => {
                  try {
                    let ruleInserted = await createRule({
                      name: `${new Date().toLocaleString()}: Test ${name}`,
                      comparison,
                      weight: extractWeight(weight) / 100
                    } as TablesInsert<"rules">)
                    let res = await rankFiles({
                      rule_ids: [ruleInserted.id]
                    })
                    await deleteRule(ruleInserted.id)
                    let resForHumans = res.map(ruleRes => ({
                      rule_application_result: ruleRes.comparison_results,
                      file_name: ruleRes.name,
                      total_score: ruleRes.total_score,
                      file_metadata: ruleRes.metadata
                    }))
                    setRuleTestResults(JSON.stringify(resForHumans, null, 2))
                  } catch (e) {
                    // @ts-ignore
                    toast.error(e?.message ?? "Unknown error")
                    // @ts-ignore
                    setRuleTestResults(e?.message ?? "Unknown error")
                  }
                }}
              >
                Test Rule with Accessible Files
              </Button>
            </div>

            {ruleTestResults && (
              <div className="my-1 grid grid-cols-1 space-y-1">
                <Label>{`Rule Test Results:`}</Label>

                <pre className="whitespace-pre-wrap break-words rounded bg-gray-100 p-4 text-sm text-gray-800">
                  {ruleTestResults}
                </pre>
              </div>
            )}
          </div>
        </div>
      </Collapsible>
    </div>
  )
}
