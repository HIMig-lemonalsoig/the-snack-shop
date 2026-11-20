// Shared helpers for admin-only edge functions.
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.58.0";

/**
 * CORS: set ALLOWED_ORIGINS (comma-separated, e.g.
 * "https://your-shop.lovable.app,http://localhost:8080") in the function
 * secrets to restrict which sites may call these functions from a browser.
 * Without it every origin is allowed, as before. Auth still requires a valid
 * admin JWT either way.
 */
const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Handler = (ctx: { req: Request; caller: User; admin: SupabaseClient; body: Record<string, unknown> }) => Promise<Response>;

/**
 * Wraps a handler so it only runs for a signed-in admin, over POST, with a
 * small JSON body. Internal error details are logged, never returned.
 */
export function adminOnly(handler: Handler) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
    if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

    try {
      const url = Deno.env.get("SUPABASE_URL")!;
      const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
      const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const authHeader = req.headers.get("Authorization") ?? "";
      if (!/^Bearer\s+\S+$/i.test(authHeader)) return json(req, { error: "Not signed in" }, 401);

      const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) return json(req, { error: "Session expired. Sign in again." }, 401);

      const admin = createClient(url, service, { auth: { persistSession: false } });
      const { data: role } = await admin.from("user_roles").select("id")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!role) return json(req, { error: "Admin access required" }, 403);

      const raw = await req.text();
      if (raw.length > 4096) return json(req, { error: "Request too large" }, 413);
      let body: Record<string, unknown> = {};
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed;
        } catch {
          return json(req, { error: "Invalid JSON" }, 400);
        }
      }

      return await handler({ req, caller: user, admin, body });
    } catch (e) {
      console.error(e);
      return json(req, { error: "Something went wrong. Please try again." }, 500);
    }
  };
}
