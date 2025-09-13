import { supabase } from './supabase';
import type { Database } from './supabase';

type Tables = Database['public']['Tables'];
type TablesInsert<T extends keyof Tables> = Tables[T]['Insert'];
type TablesRow<T extends keyof Tables> = Tables[T]['Row'];

// Invitation link operations
export async function createInvitationLink(linkData: TablesInsert<'invitation_links'>): Promise<TablesRow<'invitation_links'>> {
  const { data, error } = await supabase
    .from('invitation_links')
    .insert(linkData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getInvitationLinkByToken(token: string): Promise<TablesRow<'invitation_links'>> {
  const { data, error } = await supabase
    .from('invitation_links')
    .select('*')
    .eq('token', token)
    .single();
  
  if (error) throw error;
  return data;
}

export async function markInvitationLinkAsUsed(id: string): Promise<TablesRow<'invitation_links'>> {
  const { data, error } = await supabase
    .from('invitation_links')
    .update({ used_at: new Date().toISOString() })
    .eq('token', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getInvitationLinksByClassroom(classroomId: string): Promise<TablesRow<'invitation_links'>[]> {
  const { data, error } = await supabase
    .from('invitation_links')
    .select(`
      *,
      classroom:classrooms(id, name, grade)
    `)
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function ensureParentInvitationLink(
  classroomId: string, 
  schoolId: string, 
  createdBy?: string
): Promise<TablesRow<'invitation_links'>> {
  // Prefer backend Edge Function (service role) to bypass RLS and enforce auth rules
  const { data: fnData, error: fnError } = await supabase.functions.invoke('generate_invitation_link', {
    body: { classroom_id: classroomId, intended_role: 'PARENT' },
  });
  if (fnError) throw fnError;

  // Return a minimal row-shaped object without hitting RLS-protected tables
  const minimal = {
    id: fnData.token, // placeholder id (not used by UI)
    token: fnData.token,
    classroom_id: classroomId,
    school_id: schoolId,
    intended_role: 'PARENT' as const,
    created_by: createdBy || null,
    expires_at: fnData.expires_at,
    used_at: null,
    created_at: new Date().toISOString(),
  } as unknown as TablesRow<'invitation_links'>;
  return minimal;
}

// Helper function to generate a unique invitation token
function generateInvitationToken(): string {
  // Generate a random UUID-like token
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate invitation URL
export function generateInvitationUrl(token: string): string {
  // This should match your deep link configuration
  return `futurgenie://invite?token=${token}`;
}

// New: Ensure TEACHER invitation link (Director only)
export async function ensureTeacherInvitationLink(
  classroomId: string,
  schoolId: string,
  createdBy?: string
): Promise<TablesRow<'invitation_links'>> {
  const { data: fnData, error: fnError } = await supabase.functions.invoke('generate_invitation_link', {
    body: { classroom_id: classroomId, intended_role: 'TEACHER' },
  });
  if (fnError) throw fnError;

  const { data, error } = await supabase
    .from('invitation_links')
    .select('*')
    .eq('token', fnData.token)
    .single();
  if (error) throw error;
  return data as TablesRow<'invitation_links'>;
}

// New: Revoke invitation link by token via Edge Function
export async function revokeInvitationByToken(token: string): Promise<{ success: boolean }>{
  const { error } = await supabase.functions.invoke('revoke_invitation_link', {
    body: { token },
  });
  if (error) throw error;
  return { success: true };
}

// New: Revoke active invitation for a classroom and role
export async function revokeInvitationForClassRole(
  classroomId: string,
  role: 'PARENT' | 'TEACHER'
): Promise<{ success: boolean }>{
  const { error } = await supabase.functions.invoke('revoke_invitation_link', {
    body: { classroom_id: classroomId, intended_role: role },
  });
  if (error) throw error;
  return { success: true };
}

// User operations
export async function getUserById(id: string): Promise<TablesRow<'users'>> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUser(id: string, updates: Partial<TablesRow<'users'>>): Promise<TablesRow<'users'>> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Classroom operations
export async function getClassroomById(id: string): Promise<TablesRow<'classrooms'>> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getTeacherByClassroom(classroomId: string): Promise<{ full_name: string } | null> {
  try {
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('full_name')
      .eq('classroom_id', classroomId)
      .eq('role', 'TEACHER')
      .single();

    if (teacherError || !teacher) {
      console.error('Error fetching teacher info:', teacherError);
      return { full_name: 'Enseignant(e)' };
    }

    return { full_name: teacher.full_name || 'Enseignant(e)' };
  } catch (error) {
    console.error('Error in getTeacherByClassroom:', error);
    return { full_name: 'Enseignant(e)' };
  }
}
