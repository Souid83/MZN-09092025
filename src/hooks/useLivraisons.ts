import { useState, useEffect } from 'react';
import { getLivraisons } from '../services/livraisons';
import type { DeliveryStatus } from '../types';

export function useLivraisons() {
  const [data, setData] = useState<DeliveryStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const livraisons = await getLivraisons();
        setData(livraisons);
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