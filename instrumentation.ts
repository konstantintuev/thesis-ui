// instrumentation.ts

import {createServerClient} from "@supabase/ssr";
import {Database, Tables} from "@/supabase/types";
import {createClient} from "@supabase/supabase-js";
import {MultipleFilesQueueResult} from "@/types/ml-server-communication";
import {processMultipleResult} from "@/lib/retrieval/processing/multiple";
import {SupabaseClient} from "@supabase/supabase-js";

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
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'chat_files'
            },
            async (payload) => {
                /* The chat files changed, therefore we need to recreate the collection
                * A chat doesn't know about collections, all it has is chat files.
                * We can have collection chats, where one chat creates the collection and another consumes it.
                * Here we are concerned about 'Chat Collection Creators':
                *   If a collection creator chat (e.g. file retriever) changed its chat files,
                *   we need to update the corresponding collection.
                *   We care about chat_file deleted, inserted if relevant = true and updated relevant changed!
                */
                // Find the corresponding collection id for the given chat
                const {data: collectionForChat, error} = await supabaseAdmin
                    .from("chat_collection_creator")
                    .select("*")
                    // @ts-ignore - we need chat_id from somewhere, we don't expect it to change!
                    .eq("chat_id", payload.old?.["chat_id"] ?? payload.new?.["chat_id"])
                    .single()
                if (!collectionForChat) {
                    console.error("FAILED to update file collection for retriever chat!!!")
                    return
                }
                if (payload.eventType === "DELETE") {
                    // Delete from corresponding collection
                    const {error} = await supabaseAdmin
                        .from("collection_files")
                        .delete()
                        .eq("collection_id", collectionForChat.collection_id)
                        .eq("file_id", payload.old["file_id"])
                    if (error) {
                        console.error("FAILED to delete file from collection for retriever chat!!!", error)
                    }
                } else if (payload.eventType === "INSERT") {
                    // We only add relevant files to our collection, so update only in such case
                    if (payload.new["relevant"] === true) {
                        const {error} = await supabaseAdmin
                            .from("collection_files")
                            .insert({
                                collection_id: collectionForChat.collection_id,
                                file_id: payload.new["file_id"],
                                user_id: payload.new["user_id"]
                            })
                        if (error) {
                            console.error("FAILED to delete file from collection for retriever chat!!!", error)
                        }
                    }
                } else if (payload.eventType === "UPDATE") {
                    console.log("UPDATE, relevant = ", payload?.new?.["relevant"])
                    // This check doesn't work, old doesn't contain the previous state of "relevant"
                    //if (payload.old["relevant"] != payload.new["relevant"]) {
                    // Not relevant or undefined -> try deleting
                    if (payload.new["relevant"] == false
                        || payload.new["relevant"] == null
                        || payload.new["relevant"] == undefined) {
                        // Delete from corresponding collection
                        const {error} = await supabaseAdmin
                            .from("collection_files")
                            .delete()
                            .eq("collection_id", collectionForChat.collection_id)
                            .eq("file_id", payload.new["file_id"] ?? payload.old["file_id"])
                        if (error) {
                            console.log("FAILED to delete file from collection for retriever chat!!!", error)
                        }
                    } else if (payload.new["relevant"] === true) {
                        // We only add relevant files to our collection, so insert the newly relevant one!
                        const {error} = await supabaseAdmin
                            .from("collection_files")
                            .insert({
                                collection_id: collectionForChat.collection_id,
                                file_id: payload.new["file_id"],
                                user_id: payload.new["user_id"]
                            })
                        if (error) {
                            console.log("FAILED to delete file from collection for retriever chat!!!", error)
                        }
                    }
                }
            }
        )
        .subscribe();
    console.log("registered!");
    (async function checkQueueInitially() {
        const {data: files, error} = await supabaseAdmin.from("file_upload_queue").select("*")
        for (let file of files ?? []) {
            getMultipleFileUploadFromMLServer(supabaseAdmin, file.target_collection_id!, file.id)
        }
    })();

}

function getMultipleFileUploadFromMLServer(supabaseAdmin: SupabaseClient<Database, "public", Database["public"]>,
                                           targetCollectionID: string,
                                           multiple_file_uuid: string) {
    (async function checkFileStatuesEvery30s() {
        try {
            const response = await fetch(
                `${process.env["ML_SERVER_URL"]}/file_processing/retrieve_multiple_files_from_queue?multiple_files_uuid=${multiple_file_uuid}`,
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
                console.info(`Importing files from upload queue (${multiple_file_uuid})`)
                const parsed = responseData["files"] as MultipleFilesQueueResult
                await processMultipleResult(supabaseAdmin, targetCollectionID, parsed);
                await supabaseAdmin.from("file_upload_queue").delete().eq("id", multiple_file_uuid)
            } else {
                setTimeout(checkFileStatuesEvery30s, 30_000);
            }
        } catch (e) {
            setTimeout(checkFileStatuesEvery30s, 30_000);
            //console.info("checkFileStatuesEvery30s failed with exception, try again in 30s:", e);
        }
    })();
}