import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MODEL_NAME_MAX } from "@/db/limits"
import { useStore } from "@/context/context"
import { FC, useState } from "react"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { TeamApiUpdate } from "@/types"

interface CreateModelProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateTeam: FC<CreateModelProps> = ({ isOpen, onOpenChange }) => {
  const { profile, selectedWorkspace } = useStore()

  const [isTyping, setIsTyping] = useState(false)

  const [description, setDescription] = useState("")
  const [name, setName] = useState("")
  const [emails, setEmails] = useState("")

  if (!profile || !selectedWorkspace) return null

  return (
    <SidebarCreateItem
      contentType="teams"
      isOpen={isOpen}
      isTyping={isTyping}
      onOpenChange={onOpenChange}
      createState={
        {
          description,
          name,
          emails
        } as TeamApiUpdate
      }
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              placeholder="Team name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={MODEL_NAME_MAX}
            />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>

            <Input
              placeholder="Team description..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Emails of Members</Label>

            <TextareaAutosize
              minRows={6}
              maxRows={20}
              placeholder="Emails..."
              value={emails}
              // @ts-ignore prev has no undefined values we don't want
              onValueChange={e => setEmails(e)}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
            />
          </div>
        </>
      )}
    />
  )
}
