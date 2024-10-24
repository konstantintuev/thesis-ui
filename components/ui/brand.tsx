"use client"

import Link from "next/link"
import { FC } from "react"
import { DokuHarmonieSVG } from "../icons/doku-harmonie-s-v-g"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
    <Link
      className="flex cursor-pointer flex-col items-center hover:opacity-50"
      href="https://www.chatbotui.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="mb-2">
        <DokuHarmonieSVG scale={0.6} />
      </div>

      <div className="text-4xl font-bold tracking-wide">DokuHarmonie</div>
    </Link>
  )
}
