// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    // Get auth user
    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const authUser = userRes.user;

    // Get body
    const body = await req.json().catch(() => ({}));
    const name = (body?.name as string)?.trim();
    if (!name) {
      return new Response(JSON.stringify({ error: "Missing school name" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure profile exists
    const { data: profile, error: profErr } = await serviceClient
      .from("users")
      .select("id, role, school_id")
      .eq("id", authUser.id)
      .maybeSingle();
    if (profErr) {
      return new Response(JSON.stringify({ error: profErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!profile || profile.role !== "DIRECTOR") {
      return new Response(JSON.stringify({ error: "Not a director" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create school
    const { data: school, error: sErr } = await serviceClient
      .from("schools")
      .insert({ name })
      .select("id, name, created_at")
      .single();
    if (sErr) {
      return new Response(JSON.stringify({ error: sErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Attach director to school
    const { error: uErr } = await serviceClient
      .from("users")
      .update({ school_id: school.id })
      .eq("id", authUser.id);
    if (uErr) {
      return new Response(JSON.stringify({ error: uErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update app_metadata.school_id
    const { error: mErr } = await serviceClient.auth.admin.updateUserById(authUser.id, {
      app_metadata: {
        ...(authUser.app_metadata || {}),
        role: "DIRECTOR",
        school_id: school.id,
      },
    });
    if (mErr) {
      return new Response(JSON.stringify({ error: mErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(school), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("director_create_school unexpected", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
