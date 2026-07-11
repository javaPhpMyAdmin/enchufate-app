/**
 * Edge Function: send-push-batch
 *
 * Sends push notifications to multiple devices via Expo's batch API.
 * Expo supports up to 100 messages per request.
 *
 * Expected JSON payload:
 *   {
 *     messages: Array<{ to: string, title: string, body: string, sound?: string, data?: Record<string, unknown> }>
 *   }
 *
 * Each message must have `to` (Expo Push Token). Defaults: sound="default".
 * Tokens are automatically de-duplicated by Expo.
 *
 * Deployed via: supabase functions deploy send-push-batch
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN");

serve(async (req: Request) => {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!EXPO_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: "EXPO_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Build message payloads, adding defaults.
    const payload = messages.map((m: Record<string, unknown>) => ({
      to: m.to,
      sound: m.sound ?? "default",
      title: m.title,
      body: m.body,
      data: m.data ?? {},
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
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
