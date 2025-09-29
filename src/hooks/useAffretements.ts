import { useState, useEffect } from 'react';
import { getAffretements } from '../services/affretements';
import type { FreightStatus } from '../types';

export function useAffretements() {
  const [data, setData] = useState<FreightStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const affretements = await getAffretements();
        setData(affretements);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}