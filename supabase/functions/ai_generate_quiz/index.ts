// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/*
  Edge Function: ai_generate_quiz
  - Requires authenticated user (JWT passed automatically by supabase.functions.invoke)
  - Accepts two shapes of input for backward compatibility:
    A) { lessonDescription: string, schema?: object, systemInstructions?: string }
    B) { subject: string, level: string, questionCount?: number }
  - Calls OpenAI using server-side API key
  - Returns { quiz } with a safe JSON payload
  - Validates basic constraints and returns clear 4xx/5xx codes
  - Adds lightweight logging
*/

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
} as const;

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: CORS });
}

function safeTrunc(s: string, n = 500) {
  return typeof s === 'string' && s.length > n ? s.slice(0, n) + "…" : s;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  const startedAt = Date.now();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !anonKey) {
      return json({ error: "Missing Supabase env", details: { supabaseUrl: !!supabaseUrl, anonKey: !!anonKey } }, 500);
    }
    if (!openaiKey) {
      return json({ error: "Missing OPENAI_API_KEY on server" }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    // No service role needed here; use anon + caller JWT for auth context

    // Auth required
    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const authUser = userRes.user;

    // Parse and validate input
    const body = await req.json().catch(() => ({} as any));

    // Back-compat inputs
    const lessonDescription = (body?.lessonDescription as string | undefined)?.trim();
    const subject = (body?.subject as string | undefined)?.trim();
    const level = (body?.level as string | undefined)?.trim();
    const questionCount = Math.min(Math.max(Number(body?.questionCount) || 10, 1), 10); // 1..10

    if (!lessonDescription && !(subject && level)) {
      return json({ error: "Missing input: provide lessonDescription or (subject + level)" }, 400);
    }

    // Soft rate guard: forbid >10 questions
    if ((body?.questionCount ?? 10) > 10) {
      return json({ error: "Too many requested questions (max 10)" }, 429);
    }

    // Build instructions and input prompt
    const defaultInstructions = `Tu es un expert en pédagogie Montessori. Crée un quiz éducatif de ${questionCount} questions basé sur la description de leçon fournie. Chaque question doit avoir 4 choix de réponse (A, B, C, D) avec une seule bonne réponse.\n\n**Distribuez les bonnes réponses de manière aléatoire et de maniére à ce que chaque position (A, B, C, D) soit la réponse correcte au moins deux fois.**\n\nFormat de sortie strict en JSON : {"title": "Titre", "description": "Description", "questions": [{"question": "...", "choices": [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}, {"id": "C", "text": "..."}, {"id": "D", "text": "..."}], "answer_keys": ["LETTRE_CORRECTE"], "explanation": "..."}]}.\n\nLe quiz doit être en français, avec des explications pédagogiques.`;
    const systemInstructions = (body?.systemInstructions as string | undefined) || defaultInstructions;

    const schema = (body?.schema as any) || {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "questions"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        questions: {
          type: "array",
          minItems: questionCount,
          maxItems: questionCount,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["question", "choices", "answer_keys"],
            properties: {
              question: { type: "string" },
              choices: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "text"],
                  properties: {
                    id: { type: "string", enum: ["A", "B", "C", "D"] },
                    text: { type: "string" },
                  },
                },
              },
              answer_keys: { type: "array", minItems: 1, maxItems: 1, items: { type: "string", enum: ["A", "B", "C", "D"] } },
              explanation: { type: "string" },
            },
          },
        },
      },
    };

    const input = lessonDescription
      ? `Sujet du cours: ${lessonDescription}`
      : `Générer un quiz pour le sujet: ${subject} (niveau: ${level})`;

    // Call OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: "system", content: systemInstructions },
          { role: "user", content: input },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const raw = await openaiRes.text();
    if (!openaiRes.ok) {
      console.error("ai_generate_quiz OpenAI error", { status: openaiRes.status, raw: safeTrunc(raw, 300) });
      console.log("ai_generate_quiz", { user_id: authUser.id, took_ms: Date.now() - startedAt, status: openaiRes.status });
      return json({ error: `OpenAI error ${openaiRes.status}`, details: safeTrunc(raw) }, 502);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("ai_generate_quiz invalid JSON envelope", { raw: safeTrunc(raw, 300) });
      console.log("ai_generate_quiz", { user_id: authUser.id, took_ms: Date.now() - startedAt, status: openaiRes.status });
      return json({ error: "Invalid JSON from OpenAI", details: safeTrunc(raw) }, 502);
    }

    const content: string = parsed?.choices?.[0]?.message?.content ?? "";
    if (!content) {
      console.error("ai_generate_quiz empty content", { parsed: safeTrunc(JSON.stringify(parsed), 300) });
      console.log("ai_generate_quiz", { user_id: authUser.id, took_ms: Date.now() - startedAt, status: openaiRes.status });
      return json({ error: "Empty content from model" }, 502);
    }

    // The content is expected to be a JSON string per response_format
    let quiz: any;
    try {
      quiz = JSON.parse(content);
    } catch (e) {
      console.error("ai_generate_quiz quiz parsing failed", { err: (e as Error).message, content: safeTrunc(content, 300) });
      console.log("ai_generate_quiz", { user_id: authUser.id, took_ms: Date.now() - startedAt, status: openaiRes.status });
      return json({ error: "Quiz JSON parsing failed", raw: safeTrunc(content) }, 502);
    }

    // Minimal validation
    if (!quiz?.questions || !Array.isArray(quiz.questions)) {
      console.log("ai_generate_quiz", { user_id: authUser.id, took_ms: Date.now() - startedAt, status: openaiRes.status });
      return json({ error: "Invalid quiz format: missing questions[]" }, 400);
    }
    if (quiz.questions.length !== questionCount) {
      console.log("ai_generate_quiz", { user_id: authUser.id, took_ms: Date.now() - startedAt, status: openaiRes.status });
      return json({ error: `Invalid question count: expected ${questionCount}, got ${quiz.questions.length}` }, 400);
    }

    // Normalize choices/answer_keys shapes
    quiz.questions = quiz.questions.map((q: any) => {
      if (q.choices && typeof q.choices === "object" && !Array.isArray(q.choices)) {
        q.choices = Object.entries(q.choices).map(([id, text]) => ({ id, text }));
      }
      if (!Array.isArray(q.choices)) q.choices = [];
      if (!Array.isArray(q.answer_keys)) q.answer_keys = [];
      return q;
    });

    // Lightweight log (best effort)
    try {
      console.log("ai_generate_quiz", {
        user_id: authUser.id,
        took_ms: Date.now() - startedAt,
        status: openaiRes.status,
        subject,
        level,
        questionCount,
      });
    } catch (_) {}

    return json({ quiz }, 200);
  } catch (e) {
    console.error("ai_generate_quiz unexpected", { err: e instanceof Error ? e.message : String(e) });
    return json({ error: "Unexpected error", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
