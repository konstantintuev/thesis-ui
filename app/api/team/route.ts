import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import {
  addTeamMember,
  createTeam,
  getTeamMembersByTeamId,
  getTeams,
  removeTeamMember,
  updateTeam
} from "@/db/teams"
import { Database } from "@/supabase/types"
import {
  createClient as createClientAdmin,
  SupabaseClient
} from "@supabase/supabase-js"
import { TeamApiUpdate } from "@/types"

async function emailsOfTeamID(
  teamID: string,
  supabaseAuth: SupabaseClient<Database>,
  supabaseAdmin: SupabaseClient<Database>
): Promise<string[]> {
  let teamMembers = await getTeamMembersByTeamId(teamID, supabaseAuth)

  let emailsInTeam = await supabaseAdmin.rpc("get_emails_by_user_ids", {
    user_ids: teamMembers.map(member => member.user_id)
  })
  if (emailsInTeam.error || !emailsInTeam.data) {
    throw {
      message: "Failed to query users",
      status: 500
    }
  }
  return emailsInTeam.data.map(email => email.email)
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const teamID = requestUrl.searchParams.get("teamID")

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    let userTeams = await getTeams(supabase)
    let team = userTeams.find(team => team.id === teamID)
    if (!teamID || !team) {
      const errorMessage = "Querying team you have no access to!"
      const errorCode = 400
      return new Response(JSON.stringify({ message: errorMessage }), {
        status: errorCode
      })
    }
    const supabaseAdmin = createClientAdmin<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const emailsInTeam = await emailsOfTeamID(teamID, supabase, supabaseAdmin)

    return new Response(
      JSON.stringify({
        id: teamID,
        name: team.name,
        description: team.description,
        emails: emailsInTeam.join(", "),
        // Can't read members -> doesn't include user
        has_me: emailsInTeam.length === 0
      } as TeamApiUpdate),
      {
        status: 200
      }
    )
  } catch (error: any) {
    const errorMessage =
      error.error?.message || error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

function splitEmails(input: string): string[] {
  // Handle new lines, spaces, commas and semicolons
  return input
    .split(/[\s,;]+/)
    .map(email => email.trim())
    .filter(email => email.length > 0)
}

export async function POST(request: Request) {
  try {
    const teamChangeRequest = (await request.json()) as TeamApiUpdate
    const newEmailList = splitEmails(teamChangeRequest.emails)

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      throw new Error("User not found")
    }

    const supabaseAdmin = createClientAdmin<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let userTeams = await getTeams(supabase)
    if (
      !teamChangeRequest.id ||
      !userTeams.find(team => team.id === teamChangeRequest.id)
    ) {
      throw {
        message: "Querying not your team!",
        status: 400
      }
    }

    let teamMembers = await getTeamMembersByTeamId(
      teamChangeRequest.id,
      supabase
    )
    let teamLead = teamMembers.find(
      member =>
        member.team_id === teamChangeRequest.id &&
        member.user_id === user.id &&
        member.team_lead
    )

    /* IDEA: If we remove our own email - ok!
     * If we remove more than our own email, we need to be team lead!
     */

    const oldEmailList = await emailsOfTeamID(
      teamChangeRequest.id,
      supabaseAdmin,
      supabaseAdmin
    )

    // Find all new entries
    const addedEmails = newEmailList.filter(str => !oldEmailList.includes(str))
    // Find deleted entries
    const deletedEmails = oldEmailList.filter(
      str => !newEmailList.includes(str)
    )

    let has_me = true

    // No added emails, deleted just one - yourself -> OK
    if (
      addedEmails.length === 0 &&
      deletedEmails.length === 1 &&
      user.email &&
      deletedEmails.includes(user.email)
    ) {
      await removeTeamMember(teamChangeRequest.id, user.id, supabaseAdmin)
      has_me = false
      // Other changes requiring team lead role
    } else if (teamLead) {
      let teamMembersToDelete = await supabaseAdmin.rpc(
        "get_user_ids_by_emails",
        {
          email: deletedEmails
        }
      )
      let teamMembersToAdd = await supabaseAdmin.rpc("get_user_ids_by_emails", {
        email: addedEmails
      })
      if (!teamMembersToDelete.data || !teamMembersToAdd.data) {
        throw {
          message: "Failed to query users by email",
          status: 500
        }
      }
      await Promise.allSettled(
        teamMembersToAdd.data.map(user_id =>
          addTeamMember(
            {
              team_id: teamChangeRequest.id,
              user_id: user_id.id
            },
            supabaseAdmin
          )
        )
      )
      await Promise.allSettled(
        teamMembersToDelete.data.map(user_id =>
          removeTeamMember(teamChangeRequest.id, user_id.id, supabaseAdmin)
        )
      )
      await updateTeam(teamChangeRequest.id, {
        name: teamChangeRequest.name,
        description: teamChangeRequest.description
      })
      if (user.email && deletedEmails.includes(user.email)) {
        has_me = false
      }
    } else {
      throw {
        message:
          "Not team lead -> can't change members or name!\nYou can remove yourself from the team!",
        status: 400
      }
    }

    return new Response(
      JSON.stringify({
        id: teamChangeRequest.id,
        name: teamChangeRequest.name,
        description: teamChangeRequest.description,
        emails: newEmailList.join(", "),
        has_me: has_me
      } as TeamApiUpdate),
      {
        status: 200
      }
    )
  } catch (error: any) {
    const errorMessage =
      error.error?.message || error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

export async function PUT(request: Request) {
  try {
    const teamAddRequest = (await request.json()) as TeamApiUpdate
    const newEmailList = splitEmails(teamAddRequest.emails)

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      throw new Error("User not found")
    }

    const supabaseAdmin = createClientAdmin<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let team = await createTeam(
      {
        name: teamAddRequest.name,
        description: teamAddRequest.description,
        user_id: user.id
      },
      supabaseAdmin
    )

    await addTeamMember(
      {
        team_id: team.id,
        user_id: user.id,
        team_lead: true
      },
      supabaseAdmin
    )

    let teamMembersToAdd = await supabaseAdmin.rpc("get_user_ids_by_emails", {
      email: newEmailList
    })
    if (!teamMembersToAdd.data) {
      throw {
        message: "Failed to query users by email",
        status: 500
      }
    }
    await Promise.allSettled(
      teamMembersToAdd.data.map(user_id =>
        addTeamMember(
          {
            team_id: team.id,
            user_id: user_id.id
          },
          supabaseAdmin
        )
      )
    )

    return new Response(
      JSON.stringify({
        id: team.id,
        name: team.name,
        description: team.description,
        emails: newEmailList.join(", "),
        // Created a team, obviously the user is in
        has_me: true
      } as TeamApiUpdate),
      {
        status: 200
      }
    )
  } catch (error: any) {
    const errorMessage =
      error.error?.message || error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
