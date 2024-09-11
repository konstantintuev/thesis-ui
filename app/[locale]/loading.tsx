import { IconLoader2 } from "@tabler/icons-react"
import { FC } from "react"

export default function Loading() {
  return (
    <div className="flex size-full flex-col items-center justify-center">
      <IconLoader2 className="mt-4 size-12 animate-spin" />
    </div>
  )
}

export const SmallLoading: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={`flex size-full flex-col items-center justify-center ${className ?? ""}`}
    >
      <IconLoader2 className="animate-spin" size={""} />
    </div>
  )
}
