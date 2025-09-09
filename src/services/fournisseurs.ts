import { supabase } from '../lib/supabase';
import type { Fournisseur, CreateFournisseurPayload } from '../types';

export async function getAllFournisseurs(): Promise<Fournisseur[]> {
  const { data, error } = await supabase
    .from('fournisseurs')
    .select('*')
    .order('nom', { ascending: true });

  if (error) {
    throw new Error(`Error fetching fournisseurs: ${error.message}`);
  }

  return data || [];
}

export async function createFournisseur(fournisseur: CreateFournisseurPayload): Promise<Fournisseur> {
  const { data, error } = await supabase
    .from('fournisseurs')
    .insert([fournisseur])
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating fournisseur: ${error.message}`);
  }

  return data;
}

export async function updateFournisseur(id: string, fournisseur: Partial<CreateFournisseurPayload>): Promise<Fournisseur> {
  const { data, error } = await supabase
    .from('fournisseurs')
    .update(fournisseur)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating fournisseur: ${error.message}`);
  }

  return data;
}

export async function deleteFournisseurs(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('fournisseurs')
    .delete()
    .in('id', ids);

  if (error) {
    throw new Error(`Error deleting fournisseurs: ${error.message}`);
  }
}