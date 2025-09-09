import { supabase } from '../lib/supabase';
import { cleanPayload } from '../utils/cleanPayload';
import type { TransportSlip, FreightSlip, SlipStatus } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

    const data = {
      donneur_ordre: slip.client?.nom || '',
      transporteur: type === 'freight' ? slip.fournisseur?.nom || '' : '',
      tel_transporteur: type === 'freight' ? slip.fournisseur?.telephone || '' : '',
      contact_fournisseur: type === 'freight' ? slip.fournisseur?.contact_nom || '' : '',
      date: format(new Date(), 'dd/MM/yyyy', { locale: fr }),
      date_heure_chargement: `${format(new Date(slip.loading_date), 'dd/MM/yyyy', { locale: fr })} ${loadingTime}`,
      date_heure_livraison: `${format(new Date(slip.delivery_date), 'dd/MM/yyyy', { locale: fr })} ${deliveryTime}`,
      adresse_chargement: slip.loading_address || '',
      adresse_livraison: slip.delivery_address || '',
      contact_chargement: slip.loading_contact || '',
      contact_livraison: slip.delivery_contact || '',
      marchandise: slip.goods_description || '',
      volume: slip.volume?.toString() || '-',
      poids: slip.weight?.toString() || '-',
      metre: slip.metre?.toString() || '-',
      echange: slip.exchange_type === 'Oui' ? 'oui' : 'non',
      price: type === 'freight' ? slip.purchase_price?.toString() || '-' : slip.price?.toString() || '-',
      mode_reglement: slip.payment_method || '',
      nom_interlocuteur: type === 'freight' ? slip.commercial_id || 'NON RENSEIGNÉ' : '',
      number: slip.number || 'SANS NUMÉRO',
      instructions: slip.instructions || '',
      loading_instructions: slip.loading_instructions || '',
      unloading_instructions: slip.unloading_instructions || '',
      vehicle_type: slip.vehicle_type === 'Autre' ? slip.custom_vehicle_type : slip.vehicle_type || '',
      tailgate: slip.tailgate ? 'HAYON' : '',
      kilometers: slip.kilometers?.toString() || '-'
    };

    let html = template;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value?.toString() || '');
    });

    container.innerHTML = html;

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 794,
      height: 1123
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

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