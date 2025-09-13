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
    const classroom_id = (body?.classroom_id as string)?.trim();
    let intended_role: IntendedRole = (body?.intended_role as IntendedRole) || 'PARENT';
    if (!classroom_id) {
      return new Response(JSON.stringify({ error: "Missing classroom_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Load requester profile
    const { data: me, error: meErr } = await serviceClient
      .from('users')
      .select('id, role, school_id, classroom_id')
      .eq('id', authUser.id)
      .maybeSingle();
    if (meErr || !me) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Load classroom
    const { data: classroom, error: clsErr } = await serviceClient
      .from('classrooms')
      .select('id, school_id')
      .eq('id', classroom_id)
      .maybeSingle();
    if (clsErr || !classroom) {
      return new Response(JSON.stringify({ error: "Classroom not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Authorization rules
    const isDirector = me.role === 'DIRECTOR' && me.school_id === classroom.school_id;
    const isTeacherOfClass = me.role === 'TEACHER' && me.classroom_id === classroom_id;

    if (intended_role === 'PARENT') {
      if (!isDirector && !isTeacherOfClass) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
    } else if (intended_role === 'TEACHER') {
      if (!isDirector) {
        return new Response(JSON.stringify({ error: "Only director can generate TEACHER links" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
    }

    // Reuse existing active link if present
    const nowIso = new Date().toISOString();
    const { data: existing } = await serviceClient
      .from('invitation_links')
      .select('token, expires_at')
      .eq('classroom_id', classroom_id)
      .eq('intended_role', intended_role)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ token: existing.token, expires_at: existing.expires_at, intended_role }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a new token and link (7 days validity)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const token = crypto.randomUUID();

    const { error: insErr } = await serviceClient
      .from('invitation_links')
      .insert({
        token,
        school_id: classroom.school_id,
        classroom_id,
        intended_role,
        created_by: authUser.id,
        expires_at: expiresAt.toISOString(),
      } as any);
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ token, expires_at: expiresAt.toISOString(), intended_role }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error('generate_invitation_link unexpected', e);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
