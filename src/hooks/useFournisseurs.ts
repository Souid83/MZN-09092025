import { useState, useEffect } from 'react';
import { getAllFournisseurs, createFournisseur, updateFournisseur } from '../services/fournisseurs';
import type { Fournisseur, CreateFournisseurPayload } from '../types';

export function useFournisseurs() {
  const [data, setData] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const fournisseurs = await getAllFournisseurs();
        setData(fournisseurs);
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
      const fournisseurs = await getAllFournisseurs();
      setData(fournisseurs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
}

export function useCreateFournisseur() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = async (fournisseur: CreateFournisseurPayload) => {
    setLoading(true);
    try {
      const newFournisseur = await createFournisseur(fournisseur);
      setError(null);
      return newFournisseur;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}

export function useUpdateFournisseur() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = async (id: string, fournisseur: Partial<CreateFournisseurPayload>) => {
    setLoading(true);
    try {
      const updatedFournisseur = await updateFournisseur(id, fournisseur);
      setError(null);
      return updatedFournisseur;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
}