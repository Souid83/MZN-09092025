import { useState, useEffect } from 'react';
import { getAllClients, createClient, updateClient } from '../services/clients';
import type { Client, CreateClientPayload } from '../types';

export function useClients() {
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const clients = await getAllClients();
        setData(clients);
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
      const clients = await getAllClients();
      setData(clients);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
}

export function useCreateClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = async (client: CreateClientPayload) => {
    setLoading(true);
    try {
      const newClient = await createClient(client);
      setError(null);
      return newClient;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}

export function useUpdateClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = async (id: string, client: Partial<CreateClientPayload>) => {
    setLoading(true);
    try {
      const updatedClient = await updateClient(id, client);
      setError(null);
      return updatedClient;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
}