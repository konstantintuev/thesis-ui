import { toast } from "sonner"
import { supabase } from "@/lib/supabase/browser-client"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

export async function profileBroken(router: AppRouterInstance) {
  toast.error(`Profile broken or signed out! Sign in again or contact admin!`, {
    duration: 10_000
  })
  await supabase.auth.signOut()
  router.push("/login")
  router.refresh()
}
