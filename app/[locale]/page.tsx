import { DokuHarmonieSVG } from "@/components/icons/doku-harmonie-s-v-g"
import { IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"
import {redirect} from "next/navigation"
import {cookies} from "next/headers";
import {createServerClient} from "@supabase/ssr";
import {Database} from "@/supabase/types";

export default async function HomePage() {

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

  if (session) {
    const {data: homeWorkspace, error} = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      throw new Error(error.message)
    }

    return redirect(`/${homeWorkspace.id}/chat`)
  }

  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div>
        <DokuHarmonieSVG scale={0.3} />
      </div>

      <div className="mt-2 text-4xl font-bold">DokuHarmonie</div>

      <Link
        className="mt-4 flex w-[200px] items-center justify-center rounded-md bg-blue-500 p-2 font-semibold"
        href="/login"
      >
        Start Chatting
        <IconArrowRight className="ml-1" size={20} />
      </Link>
    </div>
  )
}
