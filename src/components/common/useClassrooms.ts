import { useEffect, useState, useContext } from 'react';
import { listClassrooms, type ClassroomsRow } from '../../lib/db';
import { useAuth } from '../../providers/AuthProvider';

export function useClassrooms() {
  const { user } = useAuth() as any;
  const [data, setData] = useState<ClassroomsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) { setData([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const rows = await listClassrooms();
        if (!cancelled) setData(rows);
      } catch (e: any) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]); // minimal & stable

  return { data, loading, error };
}
