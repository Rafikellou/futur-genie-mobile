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

    // Drop existing policies to start fresh
    const dropPolicies = [
      `DROP POLICY IF EXISTS "users_read_own_profile" ON users;`,
      `DROP POLICY IF EXISTS "users_read_school_members" ON users;`,
      `DROP POLICY IF EXISTS "users_read_class_members" ON users;`,
      `DROP POLICY IF EXISTS "users_update_own_profile" ON users;`,
      `DROP POLICY IF EXISTS "classrooms_read_school" ON classrooms;`,
      `DROP POLICY IF EXISTS "classrooms_manage_school" ON classrooms;`,
      `DROP POLICY IF EXISTS "schools_read_own" ON schools;`,
      `DROP POLICY IF EXISTS "schools_manage_own" ON schools;`,
      `DROP POLICY IF EXISTS "quizzes_read_school" ON quizzes;`,
      `DROP POLICY IF EXISTS "quizzes_manage_teacher" ON quizzes;`,
      `DROP POLICY IF EXISTS "quizzes_read_published_parents" ON quizzes;`,
      `DROP POLICY IF EXISTS "quiz_items_read_school" ON quiz_items;`,
      `DROP POLICY IF EXISTS "quiz_items_manage_teacher" ON quiz_items;`,
      `DROP POLICY IF EXISTS "quiz_items_read_published_parents" ON quiz_items;`,
      `DROP POLICY IF EXISTS "quiz_results_read_own" ON quiz_results;`,
      `DROP POLICY IF EXISTS "quiz_results_read_teacher" ON quiz_results;`,
      `DROP POLICY IF EXISTS "quiz_results_read_director" ON quiz_results;`,
      `DROP POLICY IF EXISTS "quiz_results_manage_own" ON quiz_results;`,
    ];

    for (const policy of dropPolicies) {
      await serviceClient.rpc('exec_sql', { sql: policy }).catch(() => {
        // Ignore errors if policy doesn't exist
      });
    }

    // Create comprehensive RLS policies
    const policies = [
      // USERS table policies
      `
      CREATE POLICY "users_read_own_profile" ON users
      FOR SELECT USING (
        auth.uid() = id
      );
      `,
      
      `
      CREATE POLICY "users_read_school_members" ON users
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users director
          WHERE director.id = auth.uid()
          AND director.role = 'DIRECTOR'
          AND director.school_id = users.school_id
        )
      );
      `,
      
      `
      CREATE POLICY "users_read_class_members" ON users
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users teacher
          WHERE teacher.id = auth.uid()
          AND teacher.role = 'TEACHER'
          AND teacher.classroom_id = users.classroom_id
        )
      );
      `,
      
      `
      CREATE POLICY "users_update_own_profile" ON users
      FOR UPDATE USING (
        auth.uid() = id
      );
      `,

      // SCHOOLS table policies
      `
      CREATE POLICY "schools_read_own" ON schools
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.school_id = schools.id
        )
      );
      `,
      
      `
      CREATE POLICY "schools_manage_own" ON schools
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'DIRECTOR'
          AND users.school_id = schools.id
        )
      );
      `,

      // CLASSROOMS table policies
      `
      CREATE POLICY "classrooms_read_school" ON classrooms
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.school_id = classrooms.school_id
        )
      );
      `,
      
      `
      CREATE POLICY "classrooms_manage_school" ON classrooms
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'DIRECTOR'
          AND users.school_id = classrooms.school_id
        )
      );
      `,

      // QUIZZES table policies
      `
      CREATE POLICY "quizzes_read_school" ON quizzes
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users u
          JOIN classrooms c ON c.school_id = u.school_id
          WHERE u.id = auth.uid()
          AND c.id = quizzes.classroom_id
        )
      );
      `,
      
      `
      CREATE POLICY "quizzes_manage_teacher" ON quizzes
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND (
            users.role = 'TEACHER' AND users.classroom_id = quizzes.classroom_id
            OR users.role = 'DIRECTOR' AND EXISTS (
              SELECT 1 FROM classrooms
              WHERE classrooms.id = quizzes.classroom_id
              AND classrooms.school_id = users.school_id
            )
          )
        )
      );
      `,

      `
      CREATE POLICY "quizzes_read_published_parents" ON quizzes
      FOR SELECT USING (
        quizzes.is_published = true
        AND EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'PARENT'
          AND users.classroom_id = quizzes.classroom_id
        )
      );
      `,

      // QUIZ_ITEMS table policies
      `
      CREATE POLICY "quiz_items_read_school" ON quiz_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users u
          JOIN classrooms c ON c.school_id = u.school_id
          WHERE u.id = auth.uid()
          AND c.id = quiz_items.classroom_id
        )
      );
      `,
      
      `
      CREATE POLICY "quiz_items_manage_teacher" ON quiz_items
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND (
            users.role = 'TEACHER' AND users.classroom_id = quiz_items.classroom_id
            OR users.role = 'DIRECTOR' AND EXISTS (
              SELECT 1 FROM classrooms
              WHERE classrooms.id = quiz_items.classroom_id
              AND classrooms.school_id = users.school_id
            )
          )
        )
      );
      `,

      `
      CREATE POLICY "quiz_items_read_published_parents" ON quiz_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM quizzes q
          WHERE q.id = quiz_items.quiz_id
          AND q.is_published = true
          AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'PARENT'
            AND users.classroom_id = q.classroom_id
          )
        )
      );
      `,

      // QUIZ_RESULTS table policies
      `
      CREATE POLICY "quiz_results_read_own" ON quiz_results
      FOR SELECT USING (
        quiz_results.user_id = auth.uid()
      );
      `,
      
      `
      CREATE POLICY "quiz_results_read_teacher" ON quiz_results
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users u
          JOIN quizzes q ON q.classroom_id = u.classroom_id
          WHERE u.id = auth.uid()
          AND u.role = 'TEACHER'
          AND q.id = quiz_results.quiz_id
        )
      );
      `,
      
      `
      CREATE POLICY "quiz_results_read_director" ON quiz_results
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users u
          JOIN quizzes q ON q.school_id = u.school_id
          WHERE u.id = auth.uid()
          AND u.role = 'DIRECTOR'
          AND q.id = quiz_results.quiz_id
        )
      );
      `,
      
      `
      CREATE POLICY "quiz_results_manage_own" ON quiz_results
      FOR ALL USING (
        quiz_results.user_id = auth.uid()
      );
      `,
    ];

    const results: Array<{policy: string, error?: string, success?: boolean}> = [];
    for (const policy of policies) {
      try {
        const { error } = await serviceClient.rpc('exec_sql', { sql: policy });
        if (error) {
          results.push({ policy: policy.substring(0, 50) + "...", error: error.message });
        } else {
          results.push({ policy: policy.substring(0, 50) + "...", success: true });
        }
      } catch (e) {
        results.push({ 
          policy: policy.substring(0, 50) + "...", 
          error: e instanceof Error ? e.message : String(e) 
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: "RLS policies setup completed",
      results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (e) {
    console.error("setup_rls_policies unexpected error:", e);
    return new Response(JSON.stringify({ 
      error: "Unexpected error during RLS setup",
      details: e instanceof Error ? e.message : String(e)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
