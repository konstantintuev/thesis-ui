import { createClient } from "@/lib/supabase/middleware"
import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"

const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME as string
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD as string

function performBasicAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorizedResponse()
  }

  const base64Credentials = authHeader.slice("Basic ".length)
  let credentials = ""

  try {
    credentials = Buffer.from(base64Credentials, "base64").toString("utf8")
  } catch (error) {
    return unauthorizedResponse()
  }

  const [username, password] = credentials.split(":")

  if (
    username === BASIC_AUTH_USERNAME &&
    password === BASIC_AUTH_PASSWORD
  ) {
    return null // Authorized, proceed
  }

  return unauthorizedResponse()
}

// Function to return 401 Unauthorized response
function unauthorizedResponse() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area"',
    },
  })
}

export async function middleware(request: NextRequest) {
  //const basicAuthResult = performBasicAuth(request)
  //if (basicAuthResult) {
    //return basicAuthResult
  //}


  const i18nResult = i18nRouter(request, i18nConfig)
  if (i18nResult) return i18nResult

  try {
    const { supabase, response } = createClient(request)

    const session = await supabase.auth.getSession()

    const redirectToChat = session && request.nextUrl.pathname === "/"

    if (redirectToChat) {
      const { data: homeWorkspace, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", session.data.session?.user.id)
        .eq("is_home", true)
        .single()

      if (!homeWorkspace) {
        throw new Error(error?.message)
      }

      return NextResponse.redirect(
        new URL(`/${homeWorkspace.id}/chat`, request.url)
      )
    }

    return response
  } catch (e) {
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    })
  }
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next|auth).*)"
}
