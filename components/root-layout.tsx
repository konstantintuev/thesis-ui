"use server"

import { ReactNode } from "react"

import initTranslations from "@/lib/i18n"
import { Providers } from "@/components/utility/providers"
import TranslationsProvider from "@/components/utility/translations-provider"
import { Toaster } from "@/components/ui/sonner"
import Loading from "@/app/[locale]/loading"
import { GlobalStateInit } from "@/components/utility/global-state-init"
import {cookies} from "next/headers";
import {createServerClient} from "@supabase/ssr";
import { Database } from "@/supabase/types"

interface RootLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

const i18nNamespaces = ["translation"]

export async function RootLayoutComponent({
  children,
  params: { locale }
}: RootLayoutProps) {
  const translations = await initTranslations(locale, i18nNamespaces)

  if (!translations) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loading />
      </div>
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
  const session = (await supabase.auth.getSession()).data.session

  return (
    <Providers attribute="class" defaultTheme="light">
      <TranslationsProvider
        namespaces={i18nNamespaces}
        locale={locale}
        resources={translations.resources}
      >
        <Toaster richColors position="top-center" duration={3000} />
        <div className="bg-background text-foreground flex h-dvh flex-col items-center overflow-x-auto">
          {session ? <GlobalStateInit>{children}</GlobalStateInit> : children}
        </div>
      </TranslationsProvider>
    </Providers>
  )
}
