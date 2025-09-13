// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Parse token from URL or body
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get('token') || undefined;
    const body = await req.json().catch(() => ({}));
    const token = (body?.token as string | undefined)?.trim() || tokenFromQuery;

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: inv, error } = await serviceClient
      .from('invitation_links')
      .select('token, school_id, classroom_id, intended_role, expires_at, used_at, classrooms:classroom_id(id, name, grade)')
      .eq('token', token)
      .maybeSingle();

    if (error || !inv) {
      return new Response(JSON.stringify({ error: "Invalid invitation" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (new Date(inv.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Invitation expired" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true,
      token: inv.token,
      school_id: inv.school_id,
      classroom_id: inv.classroom_id,
      intended_role: inv.intended_role,
      expires_at: inv.expires_at,
      classroom: inv.classrooms ? { id: inv.classrooms.id, name: inv.classrooms.name, grade: inv.classrooms.grade } : null,
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (e) {
    console.error('invitation_preview unexpected', e);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
