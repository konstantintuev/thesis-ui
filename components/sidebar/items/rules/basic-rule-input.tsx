import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RULE_NAME_MAX, RULE_WEIGHT_MAX } from "@/db/limits"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { Button } from "@/components/ui/button"
import { text2Query } from "@/lib/rule-processing"
import { toast } from "sonner"
import { IconChevronRight, IconRepeat } from "@tabler/icons-react"
import { FC, useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { getBasicRuleInstructions } from "@/components/sidebar/items/rules/rule-instructions"
import { createRule, deleteRule, rankFiles } from "@/db/rules"
import { TablesInsert } from "@/supabase/types"
import { RuleType } from "@/types/rules"
import { SmallLoading } from "@/app/[locale]/loading"

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

export const BasicRuleInput: FC<{
  useExpandedSheet: boolean
  setUseExpandedSheet: React.Dispatch<React.SetStateAction<boolean>>
  name: string
  setName: React.Dispatch<React.SetStateAction<string>>
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>
  weight: string
  setWeight: React.Dispatch<React.SetStateAction<string>>
  comparison: string
  setComparison: React.Dispatch<React.SetStateAction<string>>
  ruleTestResults?: string
  setRuleTestResults: React.Dispatch<React.SetStateAction<string | undefined>>
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
  ruleTestResults,
  setRuleTestResults,
  ruleType,
  setRuleType,
  isLoading,
  setIsLoading
}): JSX.Element => {
  let comparisonIsJson = isJson(comparison)

  return (
    <div>
      <Collapsible
        className="pt-2"
        open={useExpandedSheet}
        onOpenChange={setUseExpandedSheet}
      >
        <CollapsibleTrigger
          disabled={isLoading}
          className="flex w-full justify-center hover:opacity-50"
        >
          <div className="mb-4 flex items-center font-bold">
            <div
              className={
                useExpandedSheet
                  ? "mb-4 pb-2 text-4xl font-bold text-gray-900"
                  : "mr-1"
              }
            >
              Instructions for Writing Metadata-Rules for Ranking Files
            </div>
            {!useExpandedSheet && <IconChevronRight size={20} stroke={3} />}
          </div>
        </CollapsibleTrigger>

        {useExpandedSheet && <hr className="mb-4 border-t-2 border-gray-200" />}

        <div
          className={`grid size-full ${useExpandedSheet ? "grid-cols-[2fr_auto_1fr]" : "grid-cols-1"}`}
        >
          <CollapsibleContent>{getBasicRuleInstructions()}</CollapsibleContent>

          {useExpandedSheet && (
            <div className="mx-6 block border-l border-gray-300"></div>
          )}

          <div className={`flex flex-col gap-2`}>
            {setRuleType && (
              <div className="space-y-1.5">
                <Label>Switch to Question-based Rules</Label>

                <Button
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                  variant="secondary"
                >
                  <IconRepeat
                    size={26}
                    onClick={() => {
                      setRuleType("advanced")
                      setUseExpandedSheet(false)
                    }}
                  />
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
                onValueChange={val => !isLoading && setComparison(val)}
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
                    if (isLoading) {
                      return
                    }
                    try {
                      setIsLoading(true)
                      let res = await text2Query(comparison)
                      setComparison(JSON.stringify(res, null, 2))
                    } catch (e) {
                      // @ts-ignore
                      toast.error(e?.message ?? "Unknown error", {
                        duration: 10_000
                      })
                    }
                    setIsLoading(false)
                  }}
                >
                  Generate Rule JSON from Plain Text{" "}
                  {isLoading ? <SmallLoading className="ml-3" /> : undefined}
                </Button>
              </div>
            )}

            <div className="my-1">
              <Button
                onClick={async () => {
                  if (isLoading) {
                    return
                  }
                  try {
                    setIsLoading(true)
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
                    setRuleTestResults(
                      resForHumans.length === 0
                        ? "Failed to get test results"
                        : JSON.stringify(resForHumans, null, 2)
                    )
                  } catch (e) {
                    // @ts-ignore
                    toast.error(e?.message ?? "Unknown error", {
                      duration: 10_000
                    })
                    // @ts-ignore
                    setRuleTestResults(e?.message ?? "Unknown error")
                  }
                  setIsLoading(false)
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
