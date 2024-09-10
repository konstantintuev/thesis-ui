"use client"

import { ReactNode, useEffect, useState } from "react"

import initTranslations from "@/lib/i18n"
import { Providers } from "@/components/utility/providers"
import TranslationsProvider from "@/components/utility/translations-provider"
import { Toaster } from "@/components/ui/sonner"
import Loading from "@/app/[locale]/loading"
import { GlobalStateInit } from "@/components/utility/global-state-init"

interface RootLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

const i18nNamespaces = ["translation"]

export function RootLayoutComponent({
  children,
  params: { locale }
}: RootLayoutProps) {
  const [translations, setTranslations] = useState<any>(undefined)

  useEffect(() => {
    ;(async function () {
      try {
        setTranslations(await initTranslations(locale, i18nNamespaces))
      } catch (e) {
        console.log(e)
      }
    })()
  }, [])

  if (!translations) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <Providers attribute="class" defaultTheme="dark">
      <TranslationsProvider
        namespaces={i18nNamespaces}
        locale={locale}
        resources={translations.resources}
      >
        <Toaster richColors position="top-center" duration={3000} />
        <div className="bg-background text-foreground flex h-dvh flex-col items-center overflow-x-auto">
          <GlobalStateInit>{children}</GlobalStateInit>
        </div>
      </TranslationsProvider>
    </Providers>
  )
}
