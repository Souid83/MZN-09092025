import { useState, useEffect } from 'react';
import { getAllTransportSlips, getAllFreightSlips } from '../services/slips';
import type { TransportSlip, FreightSlip } from '../types';

export function useSlips(type: 'transport' | 'freight', startDate?: string, endDate?: string) {
  const [data, setData] = useState<(TransportSlip | FreightSlip)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const slips = await (type === 'transport' 
          ? getAllTransportSlips(startDate, endDate)
          : getAllFreightSlips(startDate, endDate));
        setData(slips);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [type, startDate, endDate]);

  const refresh = async () => {
    setLoading(true);
    try {
      const slips = await (type === 'transport'
        ? getAllTransportSlips(startDate, endDate)
        : getAllFreightSlips(startDate, endDate));
      setData(slips);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
}