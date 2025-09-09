import { supabase } from '../lib/supabase';
import type { DeliveryStatus } from '../types';

export async function getLivraisons(): Promise<DeliveryStatus[]> {
  const { data, error } = await supabase
    .from('livraisons')
    .select(`
      id,
      status,
      clients!inner (
        nom
      ),
      numero_affretement,
      vehicules!inner (
        immatriculation
      ),
      date_chargement,
      cp_chargement,
      date_livraison,
      cp_livraison,
      kilometres,
      prix_ht,
      prix_km
    `)
    .order('date_chargement', { ascending: false });

  if (error) {
    throw new Error(`Error fetching livraisons: ${error.message}`);
  }

  // Transform the data to match the DeliveryStatus type
  const transformedData = data?.map(item => ({
    id: item.id,
    status: item.status,
    client: item.clients?.nom,
    freightNumber: item.numero_affretement,
    vehicle: item.vehicules?.immatriculation,
    loadingDate: item.date_chargement,
    loadingPostalCode: item.cp_chargement,
    deliveryDate: item.date_livraison,
    deliveryPostalCode: item.cp_livraison,
    kilometres: item.kilometres,
    priceBeforeTax: item.prix_ht,
    pricePerKm: item.prix_km
  }));

  return transformedData || [];
}