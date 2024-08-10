// instrumentation.ts

import {createServerClient} from "@supabase/ssr";
import {Database, Tables} from "@/supabase/types";
import {createClient} from "@supabase/supabase-js";
import {MultipleFilesQueueResult} from "@/types/ml-server-communication";
import {processMultipleResult} from "@/lib/retrieval/processing/multiple";
import {SupabaseClient} from "@supabase/supabase-js/src";

export function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return
    }
    const supabaseAdmin =
        createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const channel = supabaseAdmin
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'file_upload_queue'
            },
            (payload) => {
                console.log(`db_change: ${payload}`)
                getMultipleFileUploadFromMLServer(supabaseAdmin as any, payload.new["target_collection_id"], payload.new["id"])
            }
        )
        .subscribe();
    console.log("registered!");
    (async function checkQueueInitially() {
        const {data: files, error} = await supabaseAdmin.from("file_upload_queue").select("*")
        for (let file of files ?? []) {
            getMultipleFileUploadFromMLServer(supabaseAdmin as any, file.target_collection_id!, file.id)
        }
    })();

}

function getMultipleFileUploadFromMLServer(supabaseAdmin: SupabaseClient<Database, "public", Database["public"]>,
                                           targetCollectionID: string,
                                           multiple_file_uuid: string) {
    (async function checkFileStatuesEvery30s() {
        try {
            const response = await fetch(
                `http://127.0.0.1:8000/file_processing/retrieve_multiple_files_from_queue?multiple_files_uuid=${multiple_file_uuid}`,
                {
                    method: "GET"
                }
            )


            if (!response.ok) {
                setTimeout(checkFileStatuesEvery30s, 30_000);
                return
            }

            const responseData = await response.json() as any
            if (responseData["files"]) {
                const parsed = responseData["files"] as MultipleFilesQueueResult
                await processMultipleResult(supabaseAdmin, targetCollectionID, parsed);
                await supabaseAdmin.from("file_upload_queue").delete().eq("id", multiple_file_uuid)
            } else {
                setTimeout(checkFileStatuesEvery30s, 30_000);
            }
        } catch (e) {
            setTimeout(checkFileStatuesEvery30s, 30_000);
            console.info("checkFileStatuesEvery30s failed with exception, try again in 30s:", e);
        }
    })();
}