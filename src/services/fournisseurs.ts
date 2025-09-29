import { supabase } from '../lib/supabase';
import type { Fournisseur, CreateFournisseurPayload } from '../types';

// Squelette pour la future gestion des fournisseurs par utilisateur
export async function getFournisseurs(): Promise<Fournisseur[]> {
  let query = supabase
    .from('fournisseurs')
    .select('*, created_by');

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (userId) {
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const roleUpper = userRow?.role ? String(userRow.role).toUpperCase() : '';
      if (roleUpper !== 'ADMIN') {
        // Employé : fournisseurs créés OU attribués
        // 1. Récupérer les fournisseur_id attribués à l'utilisateur
        const { data: attributions, error: attribError } = await supabase
          .from('user_fournisseurs')
          .select('fournisseur_id')
          .eq('user_id', userId);

        if (attribError) {
          console.error('[getFournisseurs] Attribution fetch error:', attribError);
          return [];
        }

        const attributedFournisseurIds = (attributions || []).map(a => a.fournisseur_id);

        // 2. Récupérer les fournisseurs créés OU attribués
        let orFilter = `created_by.eq.${userId}`;
        if (attributedFournisseurIds.length > 0) {
          orFilter += `,id.in.(${attributedFournisseurIds.map(id => `"${id}"`).join(',')})`;
        }
        query = query.or(orFilter);
      }
      // ADMIN : pas de filtre, voit tout
    }
  } catch (err) {
    return [];
  }

  const { data: fournisseurs, error: fournisseursError } = await query.order('nom', { ascending: true });

  if (fournisseursError || !fournisseurs) {
    return [];
  }

  return fournisseurs;
}

// Création d'un fournisseur
export async function createFournisseur(fournisseur: CreateFournisseurPayload): Promise<Fournisseur> {
  // Récupérer l'id de l'utilisateur connecté pour le champ created_by
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    console.error('[createFournisseur] ERREUR: userId est null ou undefined ! sessionData:', sessionData);
  } else {
    console.log('[createFournisseur] userId used for created_by:', userId);
  }

  const { data: newFournisseur, error } = await supabase
    .from('fournisseurs')
    .insert([{
      ...fournisseur,
      created_by: userId || null
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating fournisseur: ${error.message}`);
  }

  return newFournisseur;
}

// Mise à jour d'un fournisseur
export async function updateFournisseur(id: string, fournisseur: Partial<CreateFournisseurPayload>): Promise<Fournisseur> {
  const { data: updatedFournisseur, error } = await supabase
    .from('fournisseurs')
    .update(fournisseur)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating fournisseur: ${error.message}`);
  }

  return updatedFournisseur;
}

// Suppression de fournisseurs
export async function deleteFournisseurs(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('fournisseurs')
    .delete()
    .in('id', ids);

  if (error) {
    throw new Error(`Error deleting fournisseurs: ${error.message}`);
  }
}
