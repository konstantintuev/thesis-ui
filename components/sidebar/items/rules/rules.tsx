import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RULE_NAME_MAX, RULE_WEIGHT_MAX } from "@/db/limits"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"

export function extractWeight(input: string): number {
  if (input === "") {
    return 0
  }
  if (input.includes("%")) {
    return parseFloat(input.slice(0, -1))
  }
  return parseFloat(input)
}

export function ruleInput(
  name: string,
  setName: React.Dispatch<React.SetStateAction<string>>,
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>,
  weight: string,
  setWeight: React.Dispatch<React.SetStateAction<string>>,
  comparison: string,
  setComparison: React.Dispatch<React.SetStateAction<string>>
) {
  return (
    <>
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
        <Label>Rule JSON</Label>

        <TextareaAutosize
          placeholder="Rule json..."
          value={comparison}
          onValueChange={setComparison}
          minRows={6}
          maxRows={150}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
        />
      </div>
    </>
  )
}
