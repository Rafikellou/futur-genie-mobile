import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: undefined, // We'll use expo-secure-store in AuthProvider
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types (based on your existing schema)
export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      classrooms: {
        Row: {
          id: string;
          name: string;
          grade: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME';
          school_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          grade: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME';
          school_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          grade?: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME';
          school_id?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          role: 'DIRECTOR' | 'TEACHER' | 'PARENT';
          school_id: string | null;
          classroom_id: string | null;
          email: string | null;
          full_name: string | null;
          created_at: string;
          child_first_name: string | null;
        };
        Insert: {
          id: string;
          role: 'DIRECTOR' | 'TEACHER' | 'PARENT';
          school_id?: string | null;
          classroom_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          child_first_name?: string | null;
        };
        Update: {
          id?: string;
          role?: 'DIRECTOR' | 'TEACHER' | 'PARENT';
          school_id?: string | null;
          classroom_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          child_first_name?: string | null;
        };
      };
      quizzes: {
        Row: {
          id: string;
          title: string;
          description: string;
          level: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME';
          owner_id: string | null;
          classroom_id: string;
          school_id: string;
          is_published: boolean;
          created_at: string;
          published_at: string | null;
          unpublish_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          level: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME';
          owner_id?: string | null;
          classroom_id: string;
          school_id: string;
          is_published?: boolean;
          created_at?: string;
          published_at?: string | null;
          unpublish_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          level?: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME';
          owner_id?: string | null;
          classroom_id?: string;
          school_id?: string;
          is_published?: boolean;
          created_at?: string;
          published_at?: string | null;
          unpublish_at?: string | null;
        };
      };
      submissions: {
        Row: {
          id: string;
          quiz_id: string;
          parent_id: string;
          answers: any;
          score: number;
          total_questions: number;
          school_id: string;
          classroom_id: string;
          created_at: string;
          completed_at: string | null;
          quiz_duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          parent_id: string;
          answers: any;
          score?: number;
          total_questions?: number;
          school_id: string;
          classroom_id: string;
          created_at?: string;
          completed_at?: string | null;
          quiz_duration_seconds?: number | null;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          parent_id?: string;
          answers?: any;
          score?: number;
          total_questions?: number;
          school_id?: string;
          classroom_id?: string;
          created_at?: string;
          completed_at?: string | null;
          quiz_duration_seconds?: number | null;
        };
      };
      invitation_links: {
        Row: {
          id: string;
          token: string;
          school_id: string;
          classroom_id: string;
          intended_role: 'PARENT' | 'TEACHER';
          created_by: string | null;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          school_id: string;
          classroom_id: string;
          intended_role: 'PARENT' | 'TEACHER';
          created_by?: string | null;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          school_id?: string;
          classroom_id?: string;
          intended_role?: 'PARENT' | 'TEACHER';
          created_by?: string | null;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

export type UserRole = 'DIRECTOR' | 'TEACHER' | 'PARENT';
