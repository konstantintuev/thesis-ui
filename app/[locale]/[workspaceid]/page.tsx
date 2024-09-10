"use client"

import { useStore } from "@/context/context"

export default function WorkspacePage() {
  const { selectedWorkspace } = useStore()

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <div className="text-4xl">{selectedWorkspace?.name}</div>
    </div>
  )
}
