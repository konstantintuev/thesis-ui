import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { FileIcon } from "@/components/ui/file-icon"
import { Input } from "@/components/ui/input"
import { CollectionFile } from "@/types"
import {
  IconChevronDown,
  IconCircleCheckFilled,
  IconUsers
} from "@tabler/icons-react"
import { FC, useEffect, useRef, useState } from "react"
import { useStore } from "@/context/context"
import { Tables } from "@/supabase/types"

export type TeamAndMe = Tables<"teams"> & {
  has_me: boolean
}

interface TeamsSelectProps {
  selectedTeams: TeamAndMe[]
  onTeamSelect: (team: TeamAndMe) => void
}

export const TeamsSelect: FC<TeamsSelectProps> = ({
  selectedTeams,
  onTeamSelect
}) => {
  const { teams } = useStore()

  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100) // FIX: hacky
    }
  }, [isOpen])

  const handleTeamSelect = (team: TeamAndMe) => {
    onTeamSelect(team)
  }

  if (!teams) return null

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={isOpen => {
        setIsOpen(isOpen)
        setSearch("")
      }}
    >
      <DropdownMenuTrigger
        className="bg-background w-full justify-start border-2 px-3 py-5"
        asChild
      >
        <Button
          ref={triggerRef}
          className="flex items-center justify-between"
          variant="ghost"
        >
          <div className="flex items-center">
            <div className="ml-2 flex items-center">
              {selectedTeams.length} teams selected!
            </div>
          </div>

          <IconChevronDown />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        style={{ width: triggerRef.current?.offsetWidth }}
        className="space-y-2 overflow-auto p-2"
        align="start"
      >
        <Input
          ref={inputRef}
          placeholder="Search teams..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.stopPropagation()}
        />

        {selectedTeams
          .filter(team =>
            team.name.toLowerCase().includes(search.toLowerCase())
          )
          .map(team => (
            <TeamItem
              key={team.id}
              team={team}
              selected={selectedTeams.some(
                selectedCollectionTeam => selectedCollectionTeam.id === team.id
              )}
              onSelect={handleTeamSelect}
            />
          ))}

        {teams
          .filter(
            team =>
              team.has_me &&
              !selectedTeams.some(
                selectedCollectionTeam => selectedCollectionTeam.id === team.id
              ) &&
              team.name.toLowerCase().includes(search.toLowerCase())
          )
          .map(team => (
            <TeamItem
              key={team.id}
              team={team}
              selected={selectedTeams.some(
                selectedCollectionTeam => selectedCollectionTeam.id === team.id
              )}
              onSelect={handleTeamSelect}
            />
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface TeamItemProps {
  team: TeamAndMe
  selected: boolean
  onSelect: (team: TeamAndMe) => void
}

const TeamItem: FC<TeamItemProps> = ({ team, selected, onSelect }) => {
  const handleSelect = () => {
    onSelect(team)
  }

  return (
    <div
      className="flex cursor-pointer items-center justify-between py-0.5 hover:opacity-50"
      onClick={handleSelect}
    >
      <div className="flex grow items-center truncate">
        <div className="mr-2 min-w-[24px]">
          <IconUsers size={24} />
        </div>

        <div className="truncate">{team.name}</div>
      </div>

      {selected && (
        <IconCircleCheckFilled size={20} className="min-w-[30px] flex-none" />
      )}
    </div>
  )
}
