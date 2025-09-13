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

    // Drop existing function if it exists
    const dropFunction = `DROP FUNCTION IF EXISTS get_user_profile(uuid);`;
    
    await serviceClient.rpc('exec_sql', { sql: dropFunction }).catch(() => {
      // Ignore errors if function doesn't exist
    });

    // Create the RPC function with SECURITY DEFINER
    const createFunction = `
      CREATE OR REPLACE FUNCTION get_user_profile(user_id_input uuid)
      RETURNS TABLE(
        id uuid,
        role text,
        email text,
        full_name text,
        school_id uuid,
        classroom_id uuid,
        created_at timestamptz,
        updated_at timestamptz
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        -- Only allow users to get their own profile
        IF auth.uid() != user_id_input THEN
          RAISE EXCEPTION 'Access denied: can only access own profile';
        END IF;
        
        RETURN QUERY
        SELECT 
          u.id,
          u.role,
          u.email,
          u.full_name,
          u.school_id,
          u.classroom_id,
          u.created_at,
          u.updated_at
        FROM users u
        WHERE u.id = user_id_input;
      END;
      $$;
    `;

    const { error: createError } = await serviceClient.rpc('exec_sql', { sql: createFunction });
    
    if (createError) {
      return new Response(JSON.stringify({ 
        error: "Failed to create RPC function",
        details: createError.message 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Grant execute permission to authenticated users
    const grantPermission = `GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;`;
    
    const { error: grantError } = await serviceClient.rpc('exec_sql', { sql: grantPermission });
    
    if (grantError) {
      return new Response(JSON.stringify({ 
        error: "Failed to grant permissions",
        details: grantError.message 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "RPC function get_user_profile created successfully with SECURITY DEFINER"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (e) {
    console.error("create_rpc_get_user_profile unexpected error:", e);
    return new Response(JSON.stringify({ 
      error: "Unexpected error during RPC creation",
      details: e instanceof Error ? e.message : String(e)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
