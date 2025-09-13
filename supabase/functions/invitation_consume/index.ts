// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Role = 'DIRECTOR' | 'TEACHER' | 'PARENT';

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
    const token = (body?.token as string)?.trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Load invitation by token
    const { data: invitation, error: invErr } = await serviceClient
      .from('invitation_links')
      .select('token, school_id, classroom_id, intended_role, expires_at, used_at')
      .eq('token', token)
      .maybeSingle();
    if (invErr || !invitation) {
      return new Response(JSON.stringify({ error: "Invalid invitation" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Invitation expired" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const role: Role = (invitation.intended_role as Role) || 'PARENT';

    // Ensure profile row exists
    const { data: existing } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!existing) {
      const full_name = (authUser.user_metadata?.first_name && authUser.user_metadata?.last_name)
        ? `${authUser.user_metadata.first_name} ${authUser.user_metadata.last_name}`
        : null;
      const { error: insErr } = await serviceClient
        .from('users')
        .insert({
          id: authUser.id,
          role,
          email: authUser.email,
          full_name,
          school_id: invitation.school_id,
          classroom_id: invitation.classroom_id,
        } as any);
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      const { error: updErr } = await serviceClient
        .from('users')
        .update({ role, school_id: invitation.school_id, classroom_id: invitation.classroom_id })
        .eq('id', authUser.id);
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Update app_metadata
    const { error: admErr } = await serviceClient.auth.admin.updateUserById(authUser.id, {
      app_metadata: {
        ...(authUser.app_metadata || {}),
        role,
        school_id: invitation.school_id,
        classroom_id: invitation.classroom_id,
      },
    });
    if (admErr) {
      return new Response(JSON.stringify({ error: admErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, role, school_id: invitation.school_id, classroom_id: invitation.classroom_id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error('invitation_consume unexpected', e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
