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

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authUser = userRes.user;
    const body = await req.json().catch(() => ({}));
    const role = (body?.role as string) || "DIRECTOR";
    const full_name = (body?.full_name as string) || null;
    const school_id = (body?.school_id as string | null) || null;

    // Check existing
    const { data: existing, error: selError } = await serviceClient
      .from("users")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle();
    if (selError) {
      console.error("bootstrap_profile select error", selError);
    }
    if (!existing) {
      const { error: insErr } = await serviceClient
        .from("users")
        .insert({
          id: authUser.id,
          role,
          email: authUser.email,
          full_name,
          school_id,
        } as any);
      if (insErr) {
        console.error("bootstrap_profile insert error", insErr);
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Ensure app_metadata contains role and school_id
    const { error: updErr } = await serviceClient.auth.admin.updateUserById(authUser.id, {
      app_metadata: {
        ...(authUser.app_metadata || {}),
        role,
        school_id,
      },
    });
    if (updErr) {
      console.error("bootstrap_profile admin update error", updErr);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bootstrap_profile unexpected", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
