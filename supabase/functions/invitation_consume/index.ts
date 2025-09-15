// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Role = 'DIRECTOR' | 'TEACHER' | 'PARENT';

Deno.serve(async (req: Request) => {
  console.log('🚀 invitation_consume Edge Function started');
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log('🔧 Environment variables loaded');
    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const serviceClient = createClient(supabaseUrl, serviceKey);

    console.log('🔐 Getting authenticated user...');
    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      console.error('❌ Authentication failed:', userErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const authUser = userRes.user;
    console.log('✅ User authenticated:', authUser.id);

    console.log('📋 Parsing request body...');
    const body = await req.json().catch(() => ({}));
    const token = (body?.token as string)?.trim();
    console.log('🎫 Invitation token:', token);
    if (!token) {
      console.error('❌ Missing token in request body');
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Load invitation by token
    console.log('🔍 Loading invitation from database...');
    const { data: invitation, error: invErr } = await serviceClient
      .from('invitation_links')
      .select('token, school_id, classroom_id, intended_role, expires_at, used_at')
      .eq('token', token)
      .maybeSingle();
    if (invErr || !invitation) {
      console.error('❌ Invalid invitation:', invErr?.message || 'Not found');
      return new Response(JSON.stringify({ error: "Invalid invitation" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log('✅ Invitation found:', invitation.intended_role, 'for school:', invitation.school_id);

    if (new Date(invitation.expires_at) < new Date()) {
      console.error('❌ Invitation expired:', invitation.expires_at);
      return new Response(JSON.stringify({ error: "Invitation expired" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const role: Role = (invitation.intended_role as Role) || 'PARENT';

    // Ensure profile row exists
    console.log('👤 Checking if user profile exists...');
    const { data: existing } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!existing) {
      console.log('➕ Creating new user profile...');
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
        console.error('❌ Failed to create user profile:', insErr.message);
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.log('✅ User profile created successfully');
    } else {
      console.log('🔄 Updating existing user profile...');
      const { error: updErr } = await serviceClient
        .from('users')
        .update({ role, school_id: invitation.school_id, classroom_id: invitation.classroom_id })
        .eq('id', authUser.id);
      if (updErr) {
        console.error('❌ Failed to update user profile:', updErr.message);
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.log('✅ User profile updated successfully');
    }

    // Update app_metadata
    console.log('🔑 Updating user app_metadata...');
    const { error: admErr } = await serviceClient.auth.admin.updateUserById(authUser.id, {
      app_metadata: {
        ...(authUser.app_metadata || {}),
        role,
        school_id: invitation.school_id,
        classroom_id: invitation.classroom_id,
      },
    });
    if (admErr) {
      console.error('❌ Failed to update app_metadata:', admErr.message);
      return new Response(JSON.stringify({ error: admErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log('✅ app_metadata updated successfully');

    // Mark invitation as used
    console.log('✅ Marking invitation as used...');
    await serviceClient
      .from('invitation_links')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    console.log('🎉 Invitation consumption completed successfully!');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('💥 Unexpected error in invitation_consume:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
