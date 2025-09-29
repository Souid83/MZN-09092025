import { supabase } from '../lib/supabase';
import type { FreightStatus } from '../types';

export async function getAffretements(): Promise<FreightStatus[]> {
  // Build base query
  let query = supabase
    .from('affretements')
    .select(`
      id,
      status,
      date_affretement,
      clients!inner (
        nom
      ),
      fournisseurs!inner (
        nom
      ),
      date_chargement,
      cp_chargement,
      date_livraison,
      cp_livraison,
      prix_achat,
      prix_vente,
      marge,
      taux_marge
    `)
    .order('date_affretement', { ascending: false });

  // Role-based visibility: EXPLOITATION sees only own records (created_by = current user)
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (userId) {
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const roleUpper = userRow?.role ? String(userRow.role).toUpperCase() : undefined;
      if (roleUpper === 'EXPLOIT' || roleUpper === 'EXPLOITATION') {
        // Apply filter only for exploitation users
        query = query.eq('created_by', userId);
      }
      // ADMIN and COMPTA/FACTURATION: no additional filter
    }
  } catch {
    // If anything fails in session/role lookup, keep default visibility (no extra filter)
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching affretements: ${error.message}`);
  }

  // Transform the data to match the FreightStatus type
  const transformedData = data?.map(item => ({
    id: item.id,
    status: item.status,
    date: item.date_affretement,
    client: item.clients?.nom,
    subcontractor: item.fournisseurs?.nom,
    loadingDate: item.date_chargement,
    loadingPostalCode: item.cp_chargement,
    deliveryDate: item.date_livraison,
    deliveryPostalCode: item.cp_livraison,
    purchasePrice: item.prix_achat,
    sellingPrice: item.prix_vente,
    margin: item.marge,
    marginRate: item.taux_marge
  }));

  return transformedData || [];
}
