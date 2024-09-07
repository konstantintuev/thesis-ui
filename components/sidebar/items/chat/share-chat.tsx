import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { updateChat } from "@/db/chats"
import { Tables } from "@/supabase/types"
import { IconEdit, IconShare } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import {
  TeamAndMe,
  TeamsSelect
} from "@/components/sidebar/items/teams/teams-select"
import { addTeamChat, deleteTeamChat, getChatSharedWithTeams } from "@/db/teams"

interface ShareChatProps {
  chat: Tables<"chats">
}

export const ShareChat: FC<ShareChatProps> = ({ chat }) => {
  const { teams } = useContext(ChatbotUIContext)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showChatDialog, setShowChatDialog] = useState(false)
  const [initialSelectedTeams, setInitialSelectedTeams] = useState<TeamAndMe[]>(
    []
  )
  const [selectedTeams, setSelectedTeams] = useState<TeamAndMe[]>([])

  const handleUpdateChat = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Find all new teams to share with
    const addedSharing = selectedTeams.filter(
      item => !initialSelectedTeams.find(initial => initial.id === item.id)
    )
    // Find teams we no longer share with
    const deletedSharing = initialSelectedTeams.filter(
      item => !selectedTeams.find(selected => selected.id === item.id)
    )

    await Promise.allSettled(
      addedSharing.map(shareWithTeam =>
        addTeamChat({
          chat_id: chat.id,
          team_id: shareWithTeam.id
        })
      )
    )
    await Promise.allSettled(
      deletedSharing.map(dontShareWithTeam =>
        deleteTeamChat(dontShareWithTeam.id, chat.id)
      )
    )

    setShowChatDialog(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  useEffect(() => {
    if (showChatDialog) {
      ;(async function () {
        let chatsShared = await getChatSharedWithTeams(chat.id).then(chats =>
          chats
            // Remove nulls
            .filter(it => !!it.teams)
            .map(
              chatShared =>
                ({
                  has_me: true,
                  ...chatShared.teams
                }) as TeamAndMe
            )
        )
        setInitialSelectedTeams(chatsShared)
        setSelectedTeams(chatsShared)
      })()
    }
  }, [showChatDialog])

  return (
    <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
      <DialogTrigger asChild>
        <IconShare className="hover:opacity-50" size={18} />
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Share Chat with Team</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label>Choose Team:</Label>

          <TeamsSelect
            onTeamSelect={team => {
              setSelectedTeams(prevState => {
                let selectedRemoved = prevState.filter(
                  prevSelected => prevSelected.id !== team.id
                )
                if (selectedRemoved.length === prevState.length) {
                  return prevState.concat(team)
                } else {
                  return selectedRemoved
                }
              })
            }}
            selectedTeams={selectedTeams}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowChatDialog(false)}>
            Cancel
          </Button>

          <Button ref={buttonRef} onClick={handleUpdateChat}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
