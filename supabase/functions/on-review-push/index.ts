/**
 * Edge Function: on-review-push
 *
 * Triggered by a Supabase Database Webhook on INSERT into the `reviews`
 * table. Sends a push notification to the target user (host) when they
 * receive a new review.
 *
 * Webhook config:
 *   - Table: reviews
 *   - Event: INSERT
 *   - Type: Edge Function
 *   - HTTP POST to: https://{ref}.supabase.co/functions/v1/on-review-push
 *   - Headers: Authorization: Bearer <anon-key>
 *
 * Deployed via: supabase functions deploy on-review-push
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  try {
    const body = await req.json();
    const record = body.record ?? body;

    const targetUserId = record.target_user_id as string | undefined;
    const authorId = record.author_id as string | undefined;
    const rating = record.rating as number | undefined;

    if (!targetUserId || !authorId) {
      return new Response(
        JSON.stringify({ error: "Missing target_user_id or author_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !EXPO_ACCESS_TOKEN) {
      console.error("[on-review-push] missing env vars");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Use service_role to bypass RLS.
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get target user's push token.
    const { data: profile } = await supa
      .from("profiles")
      .select("push_token")
      .eq("id", targetUserId)
      .not("push_token", "is", null)
      .single();

    if (!profile?.push_token) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no push token" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
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

    // 3. Build star string from rating.
    const stars = "⭐".repeat(Math.min(rating ?? 5, 5));

    // 4. Send the push notification.
    const message = {
      to: profile.push_token,
      sound: "default",
      title: `${authorName} te reseñó`,
      body: `${stars} — ¡Revisa tu nueva reseña!`,
      data: { type: "new-review", targetUserId, authorId },
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log("[on-review-push] sent notification to", targetUserId);

    return new Response(
      JSON.stringify({ sent: 1, result }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[on-review-push] error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

