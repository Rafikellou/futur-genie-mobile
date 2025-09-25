import { supabase, SUPABASE_ANON_KEY, type Database, type UserRole } from './supabase';

// Types
export type Tables = Database['public']['Tables'];
export type UsersRow = Tables['users']['Row'];
export type ClassroomsRow = Tables['classrooms']['Row'];
export type QuizzesRow = Tables['quizzes']['Row'];
export type QuizItemsRow = Tables['quiz_items']['Row'];
export type InvitationLinkRow = Tables['invitation_links']['Row'];

// Domain types for generated quiz
export interface QuizChoice { id: string; text: string }

// Invitation link helpers (migrated from lib/database.ts)

// Generate invitation URL for deep links
export function generateInvitationUrl(token: string): string {
  return `futurgenie://invite?token=${token}`;
}

// Ensure a reusable parent invitation link exists for a classroom
export async function ensureParentInvitationLink(
  classroomId: string,
  schoolId: string,
  createdBy?: string
): Promise<InvitationLinkRow> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes?.session?.access_token || SUPABASE_ANON_KEY;
  const { data: fnData, error: fnError } = await supabase.functions.invoke('generate_invitation_link', {
    body: { classroom_id: classroomId, intended_role: 'PARENT' },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (fnError) throw fnError;
  // Minimal row-like response to avoid additional RLS reads
  return {
    id: fnData.token as any,
    token: fnData.token,
    classroom_id: classroomId,
    school_id: schoolId,
    intended_role: 'PARENT' as any,
    created_by: createdBy || null,
    expires_at: fnData.expires_at,
    used_at: null,
    created_at: new Date().toISOString(),
  } as unknown as InvitationLinkRow;
}

// Ensure a teacher invitation link exists (Directors only)
export async function ensureTeacherInvitationLink(
  classroomId: string,
  schoolId: string,
  createdBy?: string
): Promise<InvitationLinkRow> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes?.session?.access_token || SUPABASE_ANON_KEY;
  const { data: fnData, error: fnError } = await supabase.functions.invoke('generate_invitation_link', {
    body: { classroom_id: classroomId, intended_role: 'TEACHER' },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (fnError) throw fnError;

  // Fetch the full row if visible via RLS
  const { data, error } = await supabase
    .from('invitation_links')
    .select('*')
    .eq('token', fnData.token)
    .single();
  if (error) throw error;
  return data as InvitationLinkRow;
}

// Revoke active invitation for a classroom and role
export async function revokeInvitationForClassRole(
  classroomId: string,
  role: 'PARENT' | 'TEACHER'
): Promise<{ success: boolean }>{
  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes?.session?.access_token || SUPABASE_ANON_KEY;
  const { error } = await supabase.functions.invoke('revoke_invitation_link', {
    body: { classroom_id: classroomId, intended_role: role },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw error;
  return { success: true };
}
export interface QuizQuestion { question: string; choices: QuizChoice[]; answer_keys: string[]; explanation?: string }
export interface GeneratedQuiz { title: string; description: string; questions: QuizQuestion[] }

// Edge Functions
export async function aiGenerateQuizByLesson(lessonDescription: string, schema?: object, systemInstructions?: string): Promise<GeneratedQuiz> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes?.session?.access_token || SUPABASE_ANON_KEY;
  const { data, error } = await supabase.functions.invoke('ai_generate_quiz', {
    body: { lessonDescription, schema, systemInstructions },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw error;
  if (!data?.quiz) throw new Error('Invalid Edge Function response: missing quiz');
  return data.quiz as GeneratedQuiz;
}

// Extended variant that allows specifying questionCount explicitly (used for improvements)
export async function aiGenerateQuizByLessonV2(args: {
  lessonDescription: string;
  questionCount?: number;
  schema?: object;
  systemInstructions?: string;
}): Promise<GeneratedQuiz> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes?.session?.access_token || SUPABASE_ANON_KEY;
  const { data, error } = await supabase.functions.invoke('ai_generate_quiz', {
    body: {
      lessonDescription: args.lessonDescription,
      questionCount: args.questionCount,
      schema: args.schema,
      systemInstructions: args.systemInstructions,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw error;
  if (!data?.quiz) throw new Error('Invalid Edge Function response: missing quiz');
  return data.quiz as GeneratedQuiz;
}

export async function aiGenerateQuizBySubject(params: { subject: string; level: string; questionCount?: number }): Promise<GeneratedQuiz> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes?.session?.access_token || SUPABASE_ANON_KEY;
  const { data, error } = await supabase.functions.invoke('ai_generate_quiz', {
    body: params,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw error;
  if (!data?.quiz) throw new Error('Invalid Edge Function response: missing quiz');
  return data.quiz as GeneratedQuiz;
}

// Quizzes persistence (new schema with quiz_items)
export async function createQuizWithItems(args: {
  quiz: GeneratedQuiz;
  owner_id: string; // user id
  school_id: string;
  classroom_id: string;
  is_published?: boolean;
}): Promise<{ quiz: QuizzesRow }>{
  const { quiz, owner_id, school_id, classroom_id } = args;
  const is_published = !!args.is_published;

  console.log('🔍 createQuizWithItems called with:', {
    quizTitle: quiz.title,
    quizDescription: quiz.description,
    questionsCount: quiz.questions?.length,
    owner_id,
    school_id,
    classroom_id,
    is_published
  });

  console.log('📝 Inserting quiz into database...');
  const { data: quizRow, error: quizErr } = await supabase
    .from('quizzes')
    .insert({
      title: quiz.title,
      description: quiz.description,
      level: 'CE1',
      owner_id,
      school_id,
      classroom_id,
      is_published,
      published_at: is_published ? new Date().toISOString() : null,
      unpublish_at: is_published ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    })
    .select()
    .single();
    
  if (quizErr) {
    console.error('❌ Error inserting quiz:', quizErr);
    throw quizErr;
  }
  
  console.log('✅ Quiz inserted successfully:', quizRow);

  console.log('📋 Preparing quiz items...');
  const quizItems = quiz.questions.map((q, index) => ({
    quiz_id: quizRow.id,
    school_id,
    classroom_id,
    question: q.question,
    choices: q.choices,
    answer_keys: q.answer_keys,
    explanation: q.explanation || null,
    order_index: index,
  }));
  
  console.log('📋 Quiz items prepared:', quizItems.length, 'items');
  console.log('📝 Inserting quiz items into database...');
  
  const { error: itemsErr } = await supabase
    .from('quiz_items')
    .insert(quizItems);
    
  if (itemsErr) {
    console.error('❌ Error inserting quiz items:', itemsErr);
    console.error('❌ Quiz items that failed:', quizItems);
    throw new Error(`Failed to save quiz questions: ${itemsErr.message}`);
  }
  
  console.log('✅ Quiz items inserted successfully');

  return { quiz: quizRow as QuizzesRow };
}

// Legacy persistence used by QuizCreationScreen (questions embedded)
export async function createLegacyQuiz(args: {
  title: string;
  description: string;
  questions: any[];
  class_id: string; // legacy column naming in that screen
  teacher_id: string;
}): Promise<void> {
  const { error } = await supabase
    .from('quizzes')
    .insert({
      title: args.title,
      description: args.description,
      // The legacy screen expects a questions field. If the DB no longer has it,
      // this call will fail and the screen should be migrated to quiz_items path.
      // We keep it here to centralize the call.
      questions: args.questions as any,
      class_id: args.class_id as any,
      teacher_id: args.teacher_id as any,
      is_published: false,
    } as any);
  if (error) throw error;
}

// Classrooms
export async function listClassrooms(): Promise<ClassroomsRow[]> {
  const { data, error } = await supabase.from('classrooms').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listQuizzesByClassroom(classroom_id: string): Promise<QuizzesRow[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('classroom_id', classroom_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Single classroom fetch (used by invitation flows)
export async function getClassroomById(id: string): Promise<ClassroomsRow> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as ClassroomsRow;
}

// Invitation preview (Edge Function)
export interface InvitationPreviewData {
  ok: boolean;
  token: string;
  school_id: string;
  classroom_id: string;
  intended_role: 'PARENT' | 'TEACHER';
  expires_at: string;
  classroom?: any;
  school?: any;
}

export async function invitationPreview(token: string): Promise<InvitationPreviewData> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const bearer = sessionRes?.session?.access_token || SUPABASE_ANON_KEY;
  const { data, error } = await supabase.functions.invoke('invitation_preview', {
    body: { token },
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error('Invalid invitation');
  return data as InvitationPreviewData;
}

// Invitation consume (Edge Function)
export async function invitationConsume(token: string, opts?: { childFirstName?: string | null }): Promise<void> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const bearer = sessionRes?.session?.access_token || SUPABASE_ANON_KEY;
  console.log('📡 Calling invitation_consume Edge Function...');
  const { data, error } = await supabase.functions.invoke('invitation_consume', {
    body: { token, childFirstName: opts?.childFirstName ?? null },
    headers: { Authorization: `Bearer ${bearer}` },
  });
  console.log('📡 invitation_consume response:', { data, error });
  if (error) {
    console.error('❌ invitation_consume Edge Function error:', error);
    throw error;
  }
}

// Director onboarding (Edge Function)
export async function directorOnboardingComplete(schoolName: string, fullName: string): Promise<any> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const bearer = sessionRes?.session?.access_token || SUPABASE_ANON_KEY;
  const { data, error } = await supabase.functions.invoke('director_onboarding_complete', {
    body: { schoolName, fullName },
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (error) throw error;
  return data;
}

// Director: list classrooms by school
export async function listClassroomsBySchool(school_id: string): Promise<ClassroomsRow[]> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('id, name, grade, school_id, created_at')
    .eq('school_id', school_id)
    .order('name');
  if (error) throw error;
  return (data ?? []) as ClassroomsRow[];
}

// Director: create classroom with RLS-safe fallback via Edge Function
export async function createClassroom(args: { name: string; grade: ClassroomsRow['grade']; school_id: string }): Promise<ClassroomsRow> {
  try {
    const { data, error } = await supabase
      .from('classrooms')
      .insert({ name: args.name, grade: args.grade, school_id: args.school_id } as any)
      .select('id, name, grade, school_id, created_at')
      .single();
    if (error) throw error;
    return data as unknown as ClassroomsRow;
  } catch (e) {
    const { data, error: fnError } = await supabase.functions.invoke('director_create_classroom', {
      body: { name: args.name, grade: args.grade, school_id: args.school_id },
    });
    if (fnError) throw fnError;
    // Minimal best-effort return; consumers may refetch list
    return {
      id: (data as any)?.id ?? `${Date.now()}`,
      name: args.name,
      grade: args.grade,
      school_id: args.school_id,
      created_at: new Date().toISOString(),
    } as unknown as ClassroomsRow;
  }
}
