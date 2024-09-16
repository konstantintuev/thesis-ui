import { FC } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "./tooltip"

interface WithTooltipProps {
  display: React.ReactNode
  trigger: React.ReactNode

  delayDuration?: number
  side?: "left" | "right" | "top" | "bottom"

  triggerClass?: string
}

export const WithTooltip: FC<WithTooltipProps> = ({
  display,
  trigger,

  delayDuration = 500,
  side = "right",
  triggerClass
}) => {
  if (display) {
    return (
      <TooltipProvider delayDuration={delayDuration}>
        <Tooltip>
          <TooltipTrigger className={triggerClass}>{trigger}</TooltipTrigger>

          <TooltipContent side={side}>{display}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  return <>{trigger}</>
}
