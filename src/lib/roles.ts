export type AppRole = 'DIRECTOR' | 'TEACHER' | 'PARENT';

export function normalizeRole(raw?: unknown): AppRole | undefined {
  const r = String(raw ?? '').trim().toUpperCase();
  if (['DIRECTOR', 'DIRECTEUR'].includes(r)) return 'DIRECTOR';
  if (['TEACHER', 'ENSEIGNANT', 'PROF'].includes(r)) return 'TEACHER';
  if (['PARENT', 'PARENTS'].includes(r)) return 'PARENT';
  return undefined;
}
