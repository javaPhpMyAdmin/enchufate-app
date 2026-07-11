/**
 * Edge Function: on-message-push
 *
 * Triggered by a Supabase Database Webhook on INSERT into the `messages`
 * table. Sends a push notification to every conversation participant
 * (except the author) who has a stored push token.
 *
 * Webhook config:
 *   - Table: messages
 *   - Event: INSERT
 *   - Type: Edge Function
 *   - HTTP POST to: https://{ref}.supabase.co/functions/v1/on-message-push
 *   - Headers: Authorization: Bearer <anon-key>
 *
 * Deployed via: supabase functions deploy on-message-push
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  try {
    // The webhook sends the inserted row in the body.
    const body = await req.json();
    const record = body.record ?? body;

    const conversationId = record.conversation_id as string | undefined;
    const authorId = record.author_id as string | undefined;
    const messageBody = record.body as string | undefined;

    if (!conversationId || !authorId || !messageBody) {
      return new Response(
        JSON.stringify({ error: "Missing conversation_id, author_id, or body" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !EXPO_ACCESS_TOKEN) {
      console.error("[on-message-push] missing env vars");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Use service_role to bypass RLS when reading profiles/conversations.
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get conversation participants.
    const { data: conv, error: convErr } = await supa
      .from("conversations")
      .select("participant_ids")
      .eq("id", conversationId)
      .single();

    if (convErr || !conv) {
      console.error("[on-message-push] conv lookup failed", convErr?.message);
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // 2. Get author display name.
    const { data: authorProfile } = await supa
      .from("profiles")
      .select("display_name")
      .eq("id", authorId)
      .single();

    const authorName =
      (authorProfile?.display_name as string) ?? "Alguien";

    // 3. Get push tokens for recipients (everyone except the author).
    const recipients = (conv.participant_ids as string[]).filter(
      (id) => id !== authorId,
    );

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no recipients" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: profiles } = await supa
      .from("profiles")
      .select("id, push_token")
      .in("id", recipients)
      .not("push_token", "is", null);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no push tokens" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // 4. Send push notifications via Expo's batch API.
    const preview =
      messageBody.length > 60
        ? `${messageBody.slice(0, 57)}...`
        : messageBody;

    const messages = profiles.map((p) => ({
      to: p.push_token,
      sound: "default",
      title: `Nuevo mensaje de ${authorName}`,
      body: preview,
      data: { type: "new-message", conversationId },
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log("[on-message-push] sent", messages.length, "notifications");

    return new Response(
      JSON.stringify({ sent: messages.length, result }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[on-message-push] error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
