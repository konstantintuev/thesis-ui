import { ChatbotUIContext } from "@/context/context"
import { LLM, LLMID, ModelProvider } from "@/types"
import { IconCheck, IconChevronDown } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { Input } from "../ui/input"

import { FileProcessor } from "@/types/file-processing"
import { FileIcon } from "@/components/ui/file-icon"

interface FileProcessingSelectProps {
  selectedProcessorId: string
  onSelectProcessor: (processorId: FileProcessor) => void
}

export const FileProcessingSelect: FC<FileProcessingSelectProps> = ({
  selectedProcessorId,
  onSelectProcessor
}) => {
  const { profile, availableFileProcessors } = useContext(ChatbotUIContext)

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

  const handleSelectProcessor = (processor: FileProcessor) => {
    onSelectProcessor(processor)
    setIsOpen(false)
  }

  const groupedFileProcessors = {
    "File Processor": availableFileProcessors
  }

  const selectedFileProcessor = availableFileProcessors.find(
    processor => processor.processorId === selectedProcessorId
  )

  if (!profile) return null

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
        disabled={availableFileProcessors.length === 0}
      >
        {availableFileProcessors.length === 0 ? (
          <div className="rounded text-sm font-bold">
            ML server returned not available file processors!
            <br />
            This might be a mistake or adding new files to the knowledgebase has
            been disabled!
          </div>
        ) : (
          <Button
            ref={triggerRef}
            className="flex items-center justify-between"
            variant="ghost"
          >
            <div className="flex items-center">
              {selectedFileProcessor ? (
                <>
                  <FileIcon size={26} type={"any"} />
                  <div className="ml-2 flex items-center">
                    {selectedFileProcessor?.processorName}
                  </div>
                </>
              ) : (
                <div className="flex items-center">Select a file processor</div>
              )}
            </div>

            <IconChevronDown />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="space-y-2 overflow-auto p-2"
        style={{ width: triggerRef.current?.offsetWidth }}
        align="start"
      >
        <Input
          ref={inputRef}
          className="w-full"
          placeholder="Search models..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="max-h-[300px] overflow-auto">
          {Object.entries(groupedFileProcessors).map(([provider, models]) => {
            const filteredModels = models
              .filter(model =>
                model.processorName.toLowerCase().includes(search.toLowerCase())
              )
              .sort((a, b) => a.provider.localeCompare(b.provider))

            if (filteredModels.length === 0) return null

            return (
              <div key={provider}>
                <div className="mb-1 ml-2 text-xs font-bold tracking-wide opacity-50">
                  {provider.toLocaleUpperCase()}
                </div>

                <div className="mb-4">
                  {filteredModels.map(fileProcessor => {
                    return (
                      <div
                        key={fileProcessor.processorId}
                        className="flex items-center space-x-1"
                      >
                        {selectedProcessorId === fileProcessor.processorId && (
                          <IconCheck className="ml-2" size={32} />
                        )}

                        <div
                          className="hover:bg-accent flex w-full cursor-pointer justify-start space-x-3 truncate rounded p-2 hover:opacity-50"
                          onClick={() => handleSelectProcessor(fileProcessor)}
                        >
                          <div className="flex items-center space-x-2">
                            <FileIcon size={28} type={"any"} />
                            <div className="text-sm font-semibold">
                              {fileProcessor.processorName}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
