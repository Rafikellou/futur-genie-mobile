import { useEffect, useState } from 'react';
import { listQuizzesByClassroom, type QuizzesRow } from '../../lib/db';

export function useQuizzes(classroom_id?: string) {
  const [data, setData] = useState<QuizzesRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!classroom_id) { setData([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const rows = await listQuizzesByClassroom(classroom_id);
        if (!cancelled) setData(rows);
      } catch (e: any) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [classroom_id]);

  return { data, loading, error };
}
