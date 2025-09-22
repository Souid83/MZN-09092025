import { supabase } from '../lib/supabase';
import { cleanPayload } from '../utils/cleanPayload';
import type { TransportSlip, FreightSlip, SlipStatus } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Agrégation des litiges par client (tous slips, période donnée)
export async function getClientDisputesStats(startDate?: string, endDate?: string) {
  // Récupère tous les slips de transport et d'affrètement de statut 'dispute'
  const [transport, freight] = await Promise.all([
    supabase
      .from('transport_slips')
      .select('id, client_id, client:client_id(nom)')
      .eq('status', 'dispute')
      .gte('loading_date', startDate || '')
      .lte('loading_date', endDate || ''),
    supabase
      .from('freight_slips')
      .select('id, client_id, client:client_id(nom)')
      .eq('status', 'dispute')
      .gte('loading_date', startDate || '')
      .lte('loading_date', endDate || '')
  ]);
  const transportDisputes = transport.data || [];
  const freightDisputes = freight.data || [];
  // Fusionne les deux listes
  const allDisputes = [...transportDisputes, ...freightDisputes];
  // Agrège par client_id
  const disputesByClient: Record<string, { client_id: string, client_nom: string, count: number }> = {};
  allDisputes.forEach((d: any) => {
    if (!d.client_id) return;
    if (!disputesByClient[d.client_id]) {
      disputesByClient[d.client_id] = {
        client_id: d.client_id,
        client_nom: d.client?.nom || 'Inconnu',
        count: 1
      };
    } else {
      disputesByClient[d.client_id].count += 1;
    }
  });
  // Retourne la liste des clients avec litiges et le total
  return {
    disputes: Object.values(disputesByClient),
    totalClientsWithDispute: Object.keys(disputesByClient).length
  };
}

export async function createFreightSlip(data: Omit<FreightSlip, 'id' | 'number' | 'created_at' | 'updated_at'>): Promise<FreightSlip> {
  const number = await getNextSlipNumber('freight');
  
  const payload = cleanPayload({
    ...data,
    number,
    created_by: (await supabase.auth.getUser()).data.user?.id
  });

  const { data: slip, error } = await supabase
    .from('freight_slips')
    .insert([payload])
    .select(`
      id,
      number,
      status,
      client_id,
      client:client_id(nom, email),
      fournisseur_id,
      fournisseur:fournisseur_id(nom, telephone),
      loading_date,
      loading_time,
      loading_time_start,
      loading_time_end,
      loading_address,
      loading_contact,
      delivery_date,
      delivery_time,
      delivery_time_start,
      delivery_time_end,
      delivery_address,
      delivery_contact,
      goods_description,
      volume,
      weight,
      metre,
      vehicle_type,
      custom_vehicle_type,
      exchange_type,
      instructions,
      price,
      payment_method,
      observations,
      photo_required,
      documents,
      commercial_id,
      order_number,
      purchase_price,
      selling_price,
      margin,
      margin_rate,
      tailgate,
      created_at,
      updated_at,
      created_by
    `)
    .single();

  if (error) {
    throw new Error(`Error creating freight slip: ${error.message}`);
  }

  return slip;
}

export async function updateFreightSlip(id: string, data: Partial<FreightSlip>): Promise<FreightSlip> {
  const cleaned = cleanPayload(data);
  console.log('🚨 Cleaned data being sent to Supabase:', cleaned);

  const { data: slip, error } = await supabase
    .from('freight_slips')
    .update(cleaned)
    .eq('id', id)
    .select(`
      id,
      number,
      status,
      client_id,
      client:client_id(nom, email),
      fournisseur_id,
      fournisseur:fournisseur_id(nom, telephone),
      loading_date,
      loading_time,
      loading_time_start,
      loading_time_end,
      loading_address,
      loading_contact,
      delivery_date,
      delivery_time,
      delivery_time_start,
      delivery_time_end,
      delivery_address,
      delivery_contact,
      goods_description,
      volume,
      weight,
      metre,
      vehicle_type,
      custom_vehicle_type,
      exchange_type,
      instructions,
      price,
      payment_method,
      observations,
      photo_required,
      documents,
      commercial_id,
      order_number,
      purchase_price,
      selling_price,
      margin,
      margin_rate,
      tailgate,
      created_at,
      updated_at,
      created_by
    `)
    .single();

  console.log('📥 Response from Supabase:', slip);

  if (error) {
    throw new Error(`Error updating freight slip: ${error.message}`);
  }

  if (!slip) {
    throw new Error(`Update failed: no data returned for slip with ID ${id}`);
  }

  return slip;
}

export async function getAllFreightSlips(startDate?: string, endDate?: string): Promise<FreightSlip[]> {
  let query = supabase
    .from('freight_slips')
    .select(`
      id,
      number,
      status,
      client_id,
      client:client_id(nom, email),
      fournisseur_id,
      fournisseur:fournisseur_id(nom, telephone),
      loading_date,
      loading_time,
      loading_time_start,
      loading_time_end,
      loading_address,
      loading_contact,
      delivery_date,
      delivery_time,
      delivery_time_start,
      delivery_time_end,
      delivery_address,
      delivery_contact,
      goods_description,
      volume,
      weight,
      metre,
      vehicle_type,
      custom_vehicle_type,
      exchange_type,
      instructions,
      price,
      payment_method,
      observations,
      photo_required,
      documents,
      commercial_id,
      order_number,
      purchase_price,
      selling_price,
      margin,
      margin_rate,
      tailgate,
      created_at,
      updated_at,
      created_by
    `)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('loading_date', startDate);
  }
  if (endDate) {
    query = query.lte('loading_date', endDate);
  }

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
        query = query.eq('created_by', userId);
      }
      // ADMIN and COMPTA/FACTURATION: no filter
    }
  } catch {
    // If any error occurs while resolving session/role, fall back to no additional filter
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching freight slips: ${error.message}`);
  }

  return data || [];
}

export async function createTransportSlip(data: Omit<TransportSlip, 'id' | 'number' | 'created_at' | 'updated_at'>): Promise<TransportSlip> {
  const number = await getNextSlipNumber('transport');
  
  const payload = cleanPayload({
    ...data,
    number,
    created_by: (await supabase.auth.getUser()).data.user?.id
  });

  console.log('🚨 Cleaned data being sent to Supabase (transport):', payload);

  const { data: slip, error } = await supabase
    .from('transport_slips')
    .insert([payload])
    .select(`
      id,
      number,
      status,
      client_id,
      client:client_id(nom, email),
      vehicule_id,
      vehicule:vehicule_id(immatriculation),
      loading_date,
      loading_time,
      loading_time_start,
      loading_time_end,
      loading_address,
      loading_contact,
      loading_instructions,
      delivery_date,
      delivery_time,
      delivery_time_start,
      delivery_time_end,
      delivery_address,
      delivery_contact,
      unloading_instructions,
      goods_description,
      volume,
      weight,
      vehicle_type,
      custom_vehicle_type,
      exchange_type,
      instructions,
      price,
      payment_method,
      observations,
      photo_required,
      documents,
      order_number,
      tailgate,
      kilometers,
      created_at,
      updated_at,
      created_by
    `)
    .single();

  if (error) {
    throw new Error(`Error creating transport slip: ${error.message}`);
  }

  return slip;
}

export async function updateTransportSlip(id: string, data: Partial<TransportSlip>): Promise<TransportSlip> {
  const cleaned = cleanPayload(data);
  console.log('🚨 Cleaned data being sent to Supabase (transport):', cleaned);

  const { data: slip, error } = await supabase
    .from('transport_slips')
    .update(cleaned)
    .eq('id', id)
    .select(`
      id,
      number,
      status,
      client_id,
      client:client_id(nom, email),
      vehicule_id,
      vehicule:vehicule_id(immatriculation),
      loading_date,
      loading_time,
      loading_time_start,
      loading_time_end,
      loading_address,
      loading_contact,
      loading_instructions,
      delivery_date,
      delivery_time,
      delivery_time_start,
      delivery_time_end,
      delivery_address,
      delivery_contact,
      unloading_instructions,
      goods_description,
      volume,
      weight,
      vehicle_type,
      custom_vehicle_type,
      exchange_type,
      instructions,
      price,
      payment_method,
      observations,
      photo_required,
      documents,
      order_number,
      tailgate,
      kilometers,
      created_at,
      updated_at,
      created_by
    `)
    .single();

  console.log('📥 Response from Supabase (transport):', slip);

  if (error) {
    throw new Error(`Error updating transport slip: ${error.message}`);
  }

  if (!slip) {
    throw new Error(`Update failed: no data returned for transport slip with ID ${id}`);
  }

  return slip;
}

export async function getAllTransportSlips(startDate?: string, endDate?: string): Promise<TransportSlip[]> {
  let query = supabase
    .from('transport_slips')
    .select(`
      id,
      number,
      status,
      client_id,
      client:client_id(nom, email),
      vehicule_id,
      vehicule:vehicule_id(immatriculation),
      loading_date,
      loading_time,
      loading_time_start,
      loading_time_end,
      loading_address,
      loading_contact,
      loading_instructions,
      delivery_date,
      delivery_time,
      delivery_time_start,
      delivery_time_end,
      delivery_address,
      delivery_contact,
      unloading_instructions,
      goods_description,
      volume,
      weight,
      vehicle_type,
      custom_vehicle_type,
      exchange_type,
      instructions,
      price,
      payment_method,
      observations,
      photo_required,
      documents,
      order_number,
      tailgate,
      kilometers,
      created_at,
      updated_at,
      created_by
    `)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('loading_date', startDate);
  }
  if (endDate) {
    query = query.lte('loading_date', endDate);
  }

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
        query = query.eq('created_by', userId);
      }
      // ADMIN and COMPTA/FACTURATION: no filter
    }
  } catch {
    // If any error occurs while resolving session/role, fall back to no additional filter
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching transport slips: ${error.message}`);
  }

  return data || [];
}

export async function updateSlipStatus(
  id: string,
  status: SlipStatus,
  type: 'transport' | 'freight'
): Promise<void> {
  const { error } = await supabase
    .from(type === 'transport' ? 'transport_slips' : 'freight_slips')
    .update({ status })
    .eq('id', id);

  if (error) {
    throw new Error(`Error updating slip status: ${error.message}`);
  }
}

export async function generatePDF(slip: TransportSlip | FreightSlip, type: 'transport' | 'freight' = 'transport'): Promise<Blob> {
  try {
    // Get current user's phone number
    const { data: { user: authUser } } = await supabase.auth.getUser();
    let userPhoneNumber = '';
    if (authUser?.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('phone_number')
        .eq('id', authUser.id)
        .single();
      userPhoneNumber = userData?.phone_number || '';
    }

    const templateUrl = type === 'transport' ? '/cmr.html' : '/affretement.html';
    const response = await fetch(templateUrl);
    const template = await response.text();

    const container = document.createElement('div');
    container.style.width = '210mm';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    let loadingTime = '';
    if (slip.loading_time_start && slip.loading_time_end) {
      loadingTime = `${slip.loading_time_start.slice(0, 5)} à ${slip.loading_time_end.slice(0, 5)}`;
    } else if (slip.loading_time) {
      loadingTime = slip.loading_time.slice(0, 5);
    }

    let deliveryTime = '';
    if (slip.delivery_time_start && slip.delivery_time_end) {
      deliveryTime = `${slip.delivery_time_start.slice(0, 5)} à ${slip.delivery_time_end.slice(0, 5)}`;
    } else if (slip.delivery_time) {
      deliveryTime = slip.delivery_time.slice(0, 5);
    } else {
      deliveryTime = 'Livraison foulée';
    }

    let data: any;
    if (type === 'freight') {
      const f = slip as FreightSlip;
      data = {
        donneur_ordre: f.client?.nom || '',
        transporteur: f.fournisseur?.nom || '',
        tel_transporteur: f.fournisseur?.telephone || '',
        contact_fournisseur: f.fournisseur?.contact_nom || '',
        date: format(new Date(), 'dd/MM/yyyy', { locale: fr }),
        date_heure_chargement: `${format(new Date(f.loading_date), 'dd/MM/yyyy', { locale: fr })} ${loadingTime}`,
        date_heure_livraison: `${format(new Date(f.delivery_date), 'dd/MM/yyyy', { locale: fr })} ${deliveryTime}`,
        adresse_chargement: f.loading_address || '',
        adresse_livraison: f.delivery_address || '',
        contact_chargement: f.loading_contact || '',
        contact_livraison: f.delivery_contact || '',
        marchandise: f.goods_description || '',
        volume: f.volume?.toString() || '-',
        poids: f.weight?.toString() || '-',
        metre: f.metre?.toString() || '-',
        echange: (String(f.exchange_type || '').toLowerCase() === 'oui') ? 'OUI' : 'NON',
        price: f.purchase_price?.toString() || '-',
        mode_reglement: f.payment_method || '',
        nom_interlocuteur: f.commercial_id || 'NON RENSEIGNÉ',
        phone_number: userPhoneNumber,
        number: f.number || 'SANS NUMÉRO',
        instructions: f.instructions || '',
        loading_instructions: f.loading_instructions || '',
        unloading_instructions: f.unloading_instructions || '',
        vehicle_type: f.vehicle_type === 'Autre' ? f.custom_vehicle_type : f.vehicle_type || '',
        tailgate: f.tailgate ? 'HAYON' : '',
        kilometers: '-' // not applicable for freight
      };
    } else {
      const t = slip as TransportSlip;
      data = {
        donneur_ordre: t.client?.nom || '',
        transporteur: '',
        tel_transporteur: '',
        contact_fournisseur: '',
        date: format(new Date(), 'dd/MM/yyyy', { locale: fr }),
        date_heure_chargement: `${format(new Date(t.loading_date), 'dd/MM/yyyy', { locale: fr })} ${loadingTime}`,
        date_heure_livraison: `${format(new Date(t.delivery_date), 'dd/MM/yyyy', { locale: fr })} ${deliveryTime}`,
        adresse_chargement: t.loading_address || '',
        adresse_livraison: t.delivery_address || '',
        contact_chargement: t.loading_contact || '',
        contact_livraison: t.delivery_contact || '',
        marchandise: t.goods_description || '',
        volume: t.volume?.toString() || '-',
        poids: t.weight?.toString() || '-',
        metre: '-', // not applicable for transport
        echange: (String(t.exchange_type || '').toLowerCase() === 'oui') ? 'OUI' : 'NON',
        price: t.price?.toString() || '-',
        mode_reglement: t.payment_method || '',
        nom_interlocuteur: '',
        phone_number: userPhoneNumber,
        number: t.number || 'SANS NUMÉRO',
        instructions: t.instructions || '',
        loading_instructions: t.loading_instructions || '',
        unloading_instructions: t.unloading_instructions || '',
        vehicle_type: t.vehicle_type === 'Autre' ? t.custom_vehicle_type : t.vehicle_type || '',
        tailgate: t.tailgate ? 'HAYON' : '',
        kilometers: t.kilometers?.toString() || '-'
      };
    }

    let html = template;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value?.toString() || '');
    });

    container.innerHTML = html;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Multi-page rendering: capture each .page separately
    const pageElements = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    for (let i = 0; i < pageElements.length; i++) {
      const pageCanvas = await html2canvas(pageElements[i], {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        height: 1123
      });
      const imgData = pageCanvas.toDataURL('image/png');
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    }

    document.body.removeChild(container);
    
    const raw = pdf.output('arraybuffer');
return new Blob([raw], { type: 'application/pdf' });

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

async function getNextSlipNumber(type: 'transport' | 'freight'): Promise<string> {
  const { data: existingConfig, error: checkError } = await supabase
    .from('slip_number_configs')
    .select('prefix, current_number')
    .eq('type', type)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Error checking slip number config: ${checkError.message}`);
  }

  if (!existingConfig) {
    const currentYear = new Date().getFullYear().toString();
    const defaultConfig = {
      type,
      prefix: currentYear,
      current_number: 0
    };

    const { error: insertError } = await supabase
      .from('slip_number_configs')
      .insert([defaultConfig]);

    if (insertError) {
      throw new Error(`Error creating default slip number config: ${insertError.message}`);
    }
  }

  const { data: config, error: fetchError } = await supabase
    .from('slip_number_configs')
    .select('prefix, current_number')
    .eq('type', type)
    .single();

  if (fetchError) {
    throw new Error(`Error fetching slip number config: ${fetchError.message}`);
  }

  const nextNumber = config.current_number + 1;

  const { error: updateError } = await supabase
    .from('slip_number_configs')
    .update({ current_number: nextNumber })
    .eq('type', type);

  if (updateError) {
    throw new Error(`Error updating slip number: ${updateError.message}`);
  }

  return `${config.prefix} ${nextNumber.toString().padStart(4, '0')}`;
}
