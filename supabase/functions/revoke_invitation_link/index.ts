// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type IntendedRole = 'PARENT' | 'TEACHER';

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const authUser = userRes.user;

    const body = await req.json().catch(() => ({}));
    const token = (body?.token as string | undefined)?.trim();
    const classroom_id = (body?.classroom_id as string | undefined)?.trim();
    const intended_role = (body?.intended_role as IntendedRole | undefined);

    // Load requester profile
    const { data: me } = await serviceClient
      .from('users')
      .select('id, role, school_id, classroom_id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!me || me.role !== 'DIRECTOR') {
      return new Response(JSON.stringify({ error: "Only director can revoke links" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    const nowIso = new Date().toISOString();

    if (token) {
      const { error: updErr } = await serviceClient
        .from('invitation_links')
        .update({ expires_at: nowIso })
        .eq('token', token);
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (!classroom_id || !intended_role) {
      return new Response(JSON.stringify({ error: "Missing token or classroom_id+intended_role" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Verify classroom belongs to director's school
    const { data: classroom } = await serviceClient
      .from('classrooms')
      .select('id, school_id')
      .eq('id', classroom_id)
      .maybeSingle();
    if (!classroom || classroom.school_id !== me.school_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    const { error: updErr } = await serviceClient
      .from('invitation_links')
      .update({ expires_at: nowIso })
      .eq('classroom_id', classroom_id)
      .eq('intended_role', intended_role)
      .gt('expires_at', nowIso);
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error('revoke_invitation_link unexpected', e);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
