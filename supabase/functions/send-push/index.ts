/**
 * Edge Function: send-push
 *
 * Sends a single Expo push notification to one device.
 *
 * Expected JSON payload:
 *   { push_token: string, title: string, body: string, data?: Record<string, unknown> }
 *
 * Requires the EXPO_ACCESS_TOKEN secret to be set in Supabase.
 * Deployed via: supabase functions deploy send-push
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN");

serve(async (req: Request) => {
  try {
    const { push_token, title, body, data } = await req.json();

    if (!push_token || !EXPO_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Missing push_token or EXPO_ACCESS_TOKEN" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const message = {
      to: push_token,
      sound: "default",
      title,
      body,
      data: data ?? {},
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
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
