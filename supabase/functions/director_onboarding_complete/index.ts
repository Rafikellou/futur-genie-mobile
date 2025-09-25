// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Get authenticated user
    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    const authUser = userRes.user;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const schoolName = (body?.schoolName as string)?.trim();
    const fullName = (body?.fullName as string)?.trim();
    
    if (!schoolName) {
      return new Response(JSON.stringify({ error: "Missing school name" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Start transaction-like operations using service client
    // 1. Check if user profile already exists
    const { data: existingProfile } = await serviceClient
      .from("users")
      .select("id, role, school_id")
      .eq("id", authUser.id)
      .maybeSingle();

    let userProfile;
    
    if (!existingProfile) {
      // 2. Create user profile as DIRECTOR
      const { data: newProfile, error: profileErr } = await serviceClient
        .from("users")
        .insert({
          id: authUser.id,
          role: "DIRECTOR",
          email: authUser.email,
          full_name: fullName || null,
          school_id: null, // Will be updated after school creation
        })
        .select("id, role, school_id")
        .single();
        
      if (profileErr) {
        return new Response(JSON.stringify({ error: `Profile creation failed: ${profileErr.message}` }), {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      userProfile = newProfile;
    } else {
      // Update existing profile to DIRECTOR if needed
      if (existingProfile.role !== "DIRECTOR") {
        const { data: updatedProfile, error: updateErr } = await serviceClient
          .from("users")
          .update({ 
            role: "DIRECTOR",
            full_name: fullName || existingProfile.full_name || null
          })
          .eq("id", authUser.id)
          .select("id, role, school_id")
          .single();
          
        if (updateErr) {
          return new Response(JSON.stringify({ error: `Profile update failed: ${updateErr.message}` }), {
            status: 400,
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
        userProfile = updatedProfile;
      } else {
        userProfile = existingProfile;
      }
    }

    // 3. Create school if user doesn't have one
    let school;
    if (!userProfile.school_id) {
      const { data: newSchool, error: schoolErr } = await serviceClient
        .from("schools")
        .insert({ name: schoolName })
        .select("id, name, created_at")
        .single();
        
      if (schoolErr) {
        return new Response(JSON.stringify({ error: `School creation failed: ${schoolErr.message}` }), {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      school = newSchool;

      // 4. Update user profile with school_id
      const { error: linkErr } = await serviceClient
        .from("users")
        .update({ school_id: school.id })
        .eq("id", authUser.id);
        
      if (linkErr) {
        return new Response(JSON.stringify({ error: `User-school linking failed: ${linkErr.message}` }), {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    } else {
      // Get existing school info
      const { data: existingSchool, error: schoolFetchErr } = await serviceClient
        .from("schools")
        .select("id, name, created_at")
        .eq("id", userProfile.school_id)
        .single();
        
      if (schoolFetchErr) {
        return new Response(JSON.stringify({ error: `School fetch failed: ${schoolFetchErr.message}` }), {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      school = existingSchool;
    }

    // 5. Update auth user app_metadata
    const { error: metaErr } = await serviceClient.auth.admin.updateUserById(authUser.id, {
      app_metadata: {
        ...(authUser.app_metadata || {}),
        role: "DIRECTOR",
        school_id: school.id,
      },
    });
    
    if (metaErr) {
      console.warn("Failed to update app_metadata:", metaErr);
      // Don't fail the entire operation for metadata update
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: authUser.id,
        role: "DIRECTOR",
        school_id: school.id,
        full_name: fullName || null,
      },
      school: {
        id: school.id,
        name: school.name,
        created_at: school.created_at,
      },
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    
  } catch (e) {
    console.error("director_onboarding_complete unexpected error:", e);
    return new Response(JSON.stringify({ 
      error: "Unexpected error during onboarding",
      details: e instanceof Error ? e.message : String(e)
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
