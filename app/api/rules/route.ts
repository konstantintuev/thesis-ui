import {Database} from "@/supabase/types"
import {createClient as createClientAdmin} from "@supabase/supabase-js"
import {transformTextToBasicRules} from "@/lib/retrieval/processing/multiple"

/* In python it is:
AttributeInfo(
            name="genre",
            description="The genre of the movie. One of ['science fiction', 'comedy', 'drama', 'thriller', 'romance', 'action', 'animated']",
            type="string",
        )
*/
export type TargetApiTypeBasicRules = {
  name: string
  description: string
  type: string
}

export async function POST(request: Request) {
  try {
    const basicRuleGenerationRequest = (await request.json()) as {
      comparisonText: string
    }

    const supabaseAdmin = createClientAdmin<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // @ts-ignore ts fails here lol
    let metadataInfo = (await supabaseAdmin.rpc("aggregate_metadata")) as {
      data?: {
        path: string
        sample: string[]
        occurrence: number
        type: string
      }[]
      error: any
    }

    if (!metadataInfo.data || metadataInfo.error) {
      throw {
        message: "Couldn't aggregate keys"
      }
    }


    let apiCallObject = metadataInfo.data
      .filter(item => item.occurrence > 1)
      .map(item => {
        return {
          name: item.path,
          description: `Here are some sample values for ${item.path}: ${item.sample
            .filter(it => it && it.length > 0)
            .join(", ")}`,
          type: item.type
        } as TargetApiTypeBasicRules
      })

    let res = await transformTextToBasicRules(
      basicRuleGenerationRequest.comparisonText,
      "Multiple different files for a large company",
      apiCallObject
    )

    if (!res.filter || res.filter.length === 0) {
      throw {
        message: res.reason_for_no_filter ?? JSON.stringify(res, null, 2)
      }
    }

    return new Response(JSON.stringify(res.filter), {
      status: 200
    })
  } catch (error: any) {
    const errorMessage =
      error.error?.message || error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({message: errorMessage}), {
      status: errorCode
    })
  }
}
