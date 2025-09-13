// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Grade = 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME';

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

    // Fetch profile to verify role and school
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
    if (!profile || profile.role !== "DIRECTOR" || !profile.school_id) {
      return new Response(JSON.stringify({ error: "Not a director or no school assigned" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const name = (body?.name as string)?.trim();
    const grade = body?.grade as Grade;
    if (!name || !grade) {
      return new Response(JSON.stringify({ error: "Missing name or grade" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert classroom
    const { data: inserted, error: insErr } = await serviceClient
      .from("classrooms")
      .insert({ name, grade, school_id: profile.school_id })
      .select("id, name, grade, school_id, created_at")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(inserted), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("director_create_classroom unexpected", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
