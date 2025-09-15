// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/*
  Edge Function: set_role
  - Secure via x-admin-token header checked against ADMIN_TOKEN secret
  - Uses SUPABASE_SERVICE_ROLE_KEY to update app_metadata.role via Admin API
  - Accepts JSON body:
      { "user_id": "uuid", "role": "TEACHER" }
    or
      { "user_id": ["uuid1","uuid2"], "role": "PARENT" }
  - Returns { success: Array<{ user_id: string }>, errors: Array<{ user_id: string, error: string }> }
*/

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeRole(raw?: unknown): "DIRECTOR" | "TEACHER" | "PARENT" | undefined {
  const r = String(raw ?? "").trim().toUpperCase();
  if (["DIRECTOR", "DIRECTEUR"].includes(r)) return "DIRECTOR";
  if (["TEACHER", "ENSEIGNANT", "PROF"].includes(r)) return "TEACHER";
  if (["PARENT", "PARENTS"].includes(r)) return "PARENT";
  return undefined;
}

Deno.serve(async (req: Request) => {
  try {
    const adminHeader = req.headers.get("x-admin-token") ?? "";
    const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ error: "Missing Supabase env" }, 500);
    }
    if (!ADMIN_TOKEN) {
      return json({ error: "Missing ADMIN_TOKEN secret" }, 500);
    }
    if (adminHeader !== ADMIN_TOKEN) {
      return json({ error: "Forbidden" }, 403);
    }

    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({} as any));
    const roleNorm = normalizeRole(body?.role);
    const uidInput = body?.user_id;

    if (!roleNorm) {
      return json({ error: "Invalid or missing role" }, 400);
    }
    if (!uidInput || (Array.isArray(uidInput) && uidInput.length === 0)) {
      return json({ error: "Missing user_id (string or array)" }, 400);
    }

    const userIds: string[] = Array.isArray(uidInput) ? uidInput : [String(uidInput)];

    const success: Array<{ user_id: string }> = [];
    const errors: Array<{ user_id: string; error: string }> = [];

    // Process sequentially to keep logs predictable; could be parallel if preferred
    for (const user_id of userIds) {
      try {
        const { data: existing } = await serviceClient.auth.admin.getUserById(user_id);
        const currentAppMeta = (existing?.user?.app_metadata ?? {}) as Record<string, any>;

        const { error } = await serviceClient.auth.admin.updateUserById(user_id, {
          app_metadata: { ...currentAppMeta, role: roleNorm },
        });
        if (error) throw error;
        success.push({ user_id });
      } catch (e: any) {
        errors.push({ user_id, error: e?.message ?? String(e) });
      }
    }

    return json({ success, errors }, errors.length ? 207 : 200); // 207 Multi-Status when partial failures
  } catch (e) {
    console.error("set_role unexpected", e);
    return json({ error: "Unexpected error", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
