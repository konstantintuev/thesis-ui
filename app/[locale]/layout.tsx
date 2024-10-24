import "@/lib/i18-helpers"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ReactNode } from "react"
import "./globals.css"
import { RootLayoutComponent } from "@/components/root-layout"

const inter = Inter({ subsets: ["latin"] })
const APP_NAME = "DokuHarmonie"
const APP_DEFAULT_TITLE = "DokuHarmonie"
const APP_TITLE_TEMPLATE = "%s - DokuHarmonie"
const APP_DESCRIPTION = "DokuHarmonie PWA!"

interface RootLayoutProps {
  children: ReactNode
  params: Promise<{
    locale: string
  }>
}

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: APP_DEFAULT_TITLE
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  }
}

export const viewport: Viewport = {
  themeColor: "#000000"
}
export default async function RootLayout({
  children,
  params
}: RootLayoutProps) {
  const {
    locale
  } = await params
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <RootLayoutComponent params={{ locale }}>
          {children}
        </RootLayoutComponent>
      </body>
    </html>
  )
}
