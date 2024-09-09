import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { FC } from "react"

interface SidebarConfirmSaveDialogProps {
  action: string
  showConfirmSaveDialog: boolean
  setShowConfirmSaveDialog: React.Dispatch<React.SetStateAction<boolean>>
  handleResult: (result: boolean) => void
}

export const SidebarConfirmSaveDialog: FC<SidebarConfirmSaveDialogProps> = ({
  action,
  showConfirmSaveDialog,
  setShowConfirmSaveDialog,
  handleResult
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      e.preventDefault()
      setShowConfirmSaveDialog(false)
      handleResult(true)
    }
  }

  return (
    <Dialog
      open={showConfirmSaveDialog}
      onOpenChange={setShowConfirmSaveDialog}
    >
      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>{`Confirm ${
            action.charAt(0).toUpperCase() + action.slice(1, action.length)
          }`}</DialogTitle>

          <DialogDescription>
            Are you sure you want to {action}?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setShowConfirmSaveDialog(false)
              handleResult(false)
            }}
          >
            Cancel
          </Button>

          <Button
            variant="default"
            tabIndex={-1}
            onClick={() => {
              setShowConfirmSaveDialog(false)
              handleResult(true)
            }}
          >
            {action.charAt(0).toUpperCase() + action.slice(1, action.length)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
