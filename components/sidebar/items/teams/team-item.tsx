import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MODEL_NAME_MAX } from "@/db/limits"
import { Tables, TablesUpdate } from "@/supabase/types"
import { IconSparkles, IconUsers } from "@tabler/icons-react"
import { FC, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"
import { TeamApiUpdate } from "@/types"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"

interface TeamItemProps {
  team: Tables<"teams">
}

export const TeamItem: FC<TeamItemProps> = ({ team }) => {
  const [isTyping, setIsTyping] = useState(false)

  return (
    <SidebarItem
      item={team}
      isTyping={isTyping}
      contentType="teams"
      icon={<IconUsers height={30} width={30} />}
      updateState={{}}
      renderInputs={(renderState: {
        teamApiContent: TeamApiUpdate | null
        setTeamApiContent: React.Dispatch<
          React.SetStateAction<TeamApiUpdate | null>
        >
      }) => (
        <>
          {(renderState.teamApiContent?.has_me === false ||
            renderState.teamApiContent?.emails.length === 0) && (
            <div className="space-y-1.5 text-sm">
              <div>Not a member of the team!</div>

              <div>The information you get is limited!</div>
            </div>
          )}
          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              disabled={renderState.teamApiContent?.emails.length === 0}
              placeholder="Team name..."
              value={renderState.teamApiContent?.name ?? "Loading..."}
              // @ts-ignore prev has no undefined values we don't want
              onChange={e =>
                renderState.setTeamApiContent(prev => {
                  return {
                    ...prev!,
                    name: e.target.value
                  }
                })
              }
              maxLength={MODEL_NAME_MAX}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
            />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>

            <Input
              disabled={renderState.teamApiContent?.emails.length === 0}
              placeholder="Team description..."
              value={renderState.teamApiContent?.description ?? "Loading..."}
              // @ts-ignore prev has no undefined values we don't want
              onChange={e =>
                renderState.setTeamApiContent(prev => {
                  return {
                    ...prev!,
                    description: e.target.value
                  }
                })
              }
              maxLength={MODEL_NAME_MAX}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
            />
          </div>

          {renderState.teamApiContent?.emails.length !== 0 && (
            <div className="space-y-1">
              <Label>Emails of Members</Label>

              <TextareaAutosize
                minRows={6}
                maxRows={20}
                placeholder="Emails..."
                value={renderState.teamApiContent?.emails ?? "Loading..."}
                // @ts-ignore prev has no undefined values we don't want
                onValueChange={e =>
                  renderState.setTeamApiContent(prev => {
                    return {
                      ...prev!,
                      emails: e
                    }
                  })
                }
                onCompositionStart={() => setIsTyping(true)}
                onCompositionEnd={() => setIsTyping(false)}
              />
            </div>
          )}
        </>
      )}
    />
  )
}
