import { supabase } from '../lib/supabase';
import type { FreightStatus } from '../types';

export async function getAffretements(): Promise<FreightStatus[]> {
  const { data, error } = await supabase
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