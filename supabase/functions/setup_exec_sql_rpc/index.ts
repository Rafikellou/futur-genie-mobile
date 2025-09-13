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

    // Create exec_sql RPC function for executing raw SQL
    const createExecSql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        EXECUTE sql;
        RETURN 'SUCCESS';
      EXCEPTION
        WHEN OTHERS THEN
          RETURN 'ERROR: ' || SQLERRM;
      END;
      $$;
    `;

    // Execute the function creation directly using the service client
    const { data, error } = await serviceClient
      .from('_dummy_table_that_does_not_exist')
      .select('*')
      .limit(0);

    // Since we can't execute raw SQL directly through the client, 
    // we'll create a simpler approach using the existing database structure
    
    return new Response(JSON.stringify({
      success: true,
      message: "Please run the following SQL manually in Supabase Dashboard:",
      sql: [
        createExecSql,
        "GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;",
        "-- Then run the setup_rls_policies and create_rpc_get_user_profile functions"
      ]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (e) {
    console.error("setup_exec_sql_rpc unexpected error:", e);
    return new Response(JSON.stringify({ 
      error: "Unexpected error",
      details: e instanceof Error ? e.message : String(e)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
