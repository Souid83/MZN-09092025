import { useState, useEffect } from 'react';
import { getAllCountries, createCountry, updateCountry } from '../services/countries';
import type { Country } from '../types';

export function useCountries() {
  const [data, setData] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const countries = await getAllCountries();
        setData(countries);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const countries = await getAllCountries();
      setData(countries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const create = async (name: string, code: string) => {
    try {
      const newCountry = await createCountry(name, code);
      setData([...data, newCountry]);
      return newCountry;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  const update = async (id: string, name: string, code: string) => {
    try {
      const updatedCountry = await updateCountry(id, name, code);
      setData(data.map(country => 
        country.id === id ? updatedCountry : country
      ));
      return updatedCountry;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  return { data, loading, error, refresh, create, update };
}