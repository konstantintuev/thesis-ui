// TODO: Separate into multiple contexts, keeping simple for now

"use client"

import { useStore } from "@/context/context"
import { getProfileByUserId } from "@/db/profile"
import { getWorkspaceImageFromStorage } from "@/db/storage/workspace-images"
import { getWorkspacesByUserId } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import {
  fetchHostedModels,
  fetchOllamaModels,
  fetchOpenRouterModels
} from "@/lib/models/fetch-models"
import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"
import { useRouter } from "next/navigation"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { fetchFileProcessorsClient } from "@/lib/retrieval/fetch-file-processors-client"
import { getTeams } from "@/db/teams"
import { profileBroken } from "@/lib/handle-bad-user"

interface GlobalStateProps {
  children: React.ReactNode
}

export const GlobalStateInit: FC<GlobalStateProps> = ({ children }) => {
  const router = useRouter()

  const {
    setEnvKeyMap,
    setAvailableHostedModels,
    setAvailableOpenRouterModels,
    setAvailableFileProcessors,
    setAvailableLocalModels,
    setProfile,
    setWorkspaces,
    setTeams,
    setWorkspaceImages,
    profile
  } = useStore()

  const startDataLoaded = useRef<boolean>(false)
  const startDataFetching = useRef<boolean>(false)

  useEffect(() => {
    ;(async () => {
      // Profile usually is defined -> we might have lost state
      if (!profile) {
        startDataLoaded.current = false
      }
      if (startDataLoaded.current || startDataFetching.current) {
        return
      }
      startDataFetching.current = true
      const profileLocal = await fetchStartingData()

      if (profileLocal) {
        const hostedModelRes = await fetchHostedModels(profileLocal)
        if (!hostedModelRes) return

        setEnvKeyMap(hostedModelRes.envKeyMap)
        setAvailableHostedModels(hostedModelRes.hostedModels)

        if (
          profileLocal["openrouter_api_key"] ||
          hostedModelRes.envKeyMap["openrouter"]
        ) {
          const openRouterModels = await fetchOpenRouterModels()
          if (!openRouterModels) return
          setAvailableOpenRouterModels(openRouterModels)
        }
      }

      const fileProcessorsRes = await fetchFileProcessorsClient()
      if (fileProcessorsRes) {
        setAvailableFileProcessors(fileProcessorsRes)
      }

      if (process.env.NEXT_PUBLIC_OLLAMA_URL) {
        const localModels = await fetchOllamaModels()
        if (!localModels) return
        setAvailableLocalModels(localModels)
      }
      startDataLoaded.current = true
      startDataFetching.current = false
    })()
  }, [])

  const fetchStartingData = async () => {
    const session = (await supabase.auth.getSession()).data.session

    if (session) {
      const user = session.user

      let profile: Tables<"profiles"> | null = null
      try {
        profile = await getProfileByUserId(user.id)
        setProfile(profile)
      } catch (e) {
        void profileBroken(router)
        throw e
      }

      if (!profile.has_onboarded) {
        return router.push("/setup")
      }

      const workspaces = await getWorkspacesByUserId(user.id)
      setWorkspaces(workspaces)

      const teams = await getTeams()
      setTeams(teams)

      for (const workspace of workspaces) {
        let workspaceImageUrl = ""

        if (workspace.image_path) {
          workspaceImageUrl =
            (await getWorkspaceImageFromStorage(workspace.image_path)) || ""
        }

        if (workspaceImageUrl) {
          const response = await fetch(workspaceImageUrl)
          const blob = await response.blob()
          const base64 = await convertBlobToBase64(blob)

          setWorkspaceImages(prev => [
            ...prev,
            {
              workspaceId: workspace.id,
              path: workspace.image_path,
              base64: base64,
              url: workspaceImageUrl
            }
          ])
        }
      }

      return profile
    } else {
      void profileBroken(router)
    }
  }

  return children
}
