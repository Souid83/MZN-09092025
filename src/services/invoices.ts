import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import { format, addDays, isBefore, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClientInvoice, TransportSlip, FreightSlip } from '../types';

// Agrégation des factures impayées et en retard (période donnée)
export async function getUnpaidInvoicesStats(startDate?: string, endDate?: string) {
  // Récupère toutes les factures "en attente" sur la période
  const { data: invoices, error } = await supabase
    .from('client_invoices')
    .select('id, numero, date_emission, montant_ttc, statut')
    .eq('statut', 'en_attente')
    .gte('date_emission', startDate || '')
    .lte('date_emission', endDate || '');

  if (error) {
    throw new Error(`Error fetching unpaid invoices: ${error.message}`);
  }

  const today = new Date();
  let unpaidCount = 0;
  let unpaidTotal = 0;
  let overdueCount = 0;
  let overdueTotal = 0;

  (invoices || []).forEach((inv) => {
    unpaidCount += 1;
    unpaidTotal += inv.montant_ttc || 0;
    // Échéance = date_emission + 30 jours
    const dueDate = addDays(parseISO(inv.date_emission), 30);
    if (isBefore(dueDate, today)) {
      overdueCount += 1;
      overdueTotal += inv.montant_ttc || 0;
    }
  });

  return {
    unpaidCount,
    unpaidTotal,
    overdueCount,
    overdueTotal
  };
}

async function assertNotExploitForbidden() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    const roleUpper = userRow?.role ? String(userRow.role).toUpperCase() : '';
    if (roleUpper === 'EXPLOIT' || roleUpper === 'EXPLOITATION') {
      throw new Error(JSON.stringify({ success: false, code: 'FORBIDDEN', message: 'Accès interdit' }));
    }
  } catch {
    // If session/role lookup fails, do not block here; UI and other guards also apply
  }
}

export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  // Get the current invoice count for this month
  const { data: invoices, error } = await supabase
    .from('client_invoices')
    .select('numero')
    .like('numero', `F${year}${month}-%`)
    .order('numero', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Error fetching invoice numbers: ${error.message}`);
  }

  let nextNumber = 1;
  if (invoices && invoices.length > 0) {
    const lastNumber = invoices[0].numero.split('-')[1];
    nextNumber = parseInt(lastNumber) + 1;
  }

  return `F${year}${month}-${nextNumber.toString().padStart(2, '0')}`;
}

export async function createInvoiceFromSlip(
  slip: TransportSlip | FreightSlip,
  type: 'transport' | 'freight'
): Promise<ClientInvoice> {
  await assertNotExploitForbidden();
  try {
    // Get current user ID for created_by field
    const { data: { user } } = await supabase.auth.getUser();
    
    // Generate invoice number
    const numero = await generateInvoiceNumber();
    
    // Get complete client information
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        nom,
        email,
        telephone,
        adresse_facturation,
        siret,
        numero_tva,
        tva_rate
      `)
      .eq('id', slip.client_id!)
      .single();

    if (clientError) {
      throw new Error(`Error fetching client data: ${clientError.message}`);
    }

    // Calculate amounts
    const montant_ht = type === 'transport' ? (slip as TransportSlip).price : ((slip as FreightSlip).selling_price || 0);
    const tva_rate = clientData?.tva_rate || 20;
    const tva = montant_ht * (tva_rate / 100);
    const montant_ttc = montant_ht + tva;

    // Generate PDF with complete client data
    const pdfBlob = await generateInvoicePDF(slip, type, numero, montant_ht, tva, montant_ttc, clientData);
    
    // Upload PDF to storage
    const pdfFileName = `invoice-${numero.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    const pdfPath = `invoices/${pdfFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(pdfPath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Erreur lors de l'upload du PDF: ${uploadError.message}`);
    }

    // Store the file path instead of URL for later signed URL generation
    const invoiceData = {
      numero,
      client_id: slip.client_id!,
      bordereau_id: slip.id,
      bordereau_type: type,
      type: 'facture',
      date_emission: format(new Date(), 'yyyy-MM-dd'),
      montant_ht,
      tva,
      montant_ttc,
      lien_pdf: pdfPath, // Store the path, not the URL
      lien_cmr: slip.documents?.cmr?.url || null,
      statut: 'en_attente' as const,
      created_by: user?.id
    };

    const { data: invoice, error } = await supabase
      .from('client_invoices')
      .insert([invoiceData])
      .select(`
        *,
        client:client_id(nom, email, adresse_facturation, telephone)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Erreur lors de l'enregistrement: ${error.message}`);
    }

    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

// New function to create a grouped invoice from multiple slips
export async function createGroupedInvoice(
  slips: (TransportSlip | FreightSlip)[],
  type: 'transport' | 'freight'
): Promise<ClientInvoice> {
  await assertNotExploitForbidden();
  try {
    if (slips.length === 0) {
      throw new Error('Aucun bordereau sélectionné');
    }

    // Get current user ID for created_by field
    const { data: { user } } = await supabase.auth.getUser();

    // Ensure all slips are from the same client
    const clientId = slips[0].client_id;
    const allSameClient = slips.every(slip => slip.client_id === clientId);
    
    if (!allSameClient || !clientId) {
      throw new Error('Tous les bordereaux doivent appartenir au même client');
    }

    // Generate invoice number
    const numero = await generateInvoiceNumber();
    
    // Get complete client information
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        nom,
        email,
        telephone,
        adresse_facturation,
        siret,
        numero_tva,
        tva_rate
      `)
      .eq('id', clientId)
      .single();

    if (clientError) {
      throw new Error(`Error fetching client data: ${clientError.message}`);
    }

    // Calculate total amounts
    const tva_rate = clientData?.tva_rate || 20;
    let total_montant_ht = 0;
    
    // Sum up all slip amounts
    slips.forEach(slip => {
      const slipAmount = type === 'transport'
        ? (slip as TransportSlip).price
        : ((slip as FreightSlip).selling_price || 0);
      total_montant_ht += slipAmount;
    });
    
    const tva = total_montant_ht * (tva_rate / 100);
    const montant_ttc = total_montant_ht + tva;

    // Generate PDF with all slips
    const pdfBlob = await generateGroupedInvoicePDF(slips, type, numero, total_montant_ht, tva, montant_ttc, clientData);
    
    // Upload PDF to storage
    const pdfFileName = `invoice-${numero.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    const pdfPath = `invoices/${pdfFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(pdfPath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Erreur lors de l'upload du PDF: ${uploadError.message}`);
    }

    // Create a JSON array of slip IDs for reference
    const slipReferences = slips.map(slip => {
      const amount = type === 'transport'
        ? (slip as TransportSlip).price
        : ((slip as FreightSlip).selling_price || 0);
      return {
        id: slip.id,
        number: slip.number,
        amount,
        order_number: (slip as any).order_number || undefined
      };
    });

    // Store the invoice with references to all slips
    const invoiceData = {
      numero,
      client_id: clientId,
      bordereau_id: null, // No single bordereau ID for grouped invoices
      bordereau_type: type,
      type: 'facture_groupee',
      date_emission: format(new Date(), 'yyyy-MM-dd'),
      montant_ht: total_montant_ht,
      tva,
      montant_ttc,
      lien_pdf: pdfPath,
      lien_cmr: null,
      statut: 'en_attente' as const,
      metadata: { slips: slipReferences }, // Store slip references in metadata
      created_by: user?.id
    };

    const { data: invoice, error } = await supabase
      .from('client_invoices')
      .insert([invoiceData])
      .select(`
        *,
        client:client_id(nom, email, adresse_facturation, telephone)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Erreur lors de l'enregistrement: ${error.message}`);
    }

    // Mark all slips as invoiced by creating invoice references
    for (const slip of slips) {
      // Create a reference record for each slip
      const referenceData = {
        invoice_id: invoice.id,
        slip_id: slip.id,
        slip_type: type
      };

      const { error: refError } = await supabase
        .from('invoice_slip_references')
        .insert([referenceData]);

      if (refError) {
        console.error('Error creating invoice reference:', refError);
        // Continue with other slips even if one reference fails
      }
    }

    return invoice;
  } catch (error) {
    console.error('Error creating grouped invoice:', error);
    throw error;
  }
}

export async function generateInvoicePDF(
  slip: TransportSlip | FreightSlip,
  type: 'transport' | 'freight',
  numero: string,
  montant_ht: number,
  tva: number,
  montant_ttc: number,
  clientData?: any // Complete client data passed from createInvoiceFromSlip
): Promise<Blob> {
  try {
    // Get company data from settings
    const { data: companySettings } = await supabase
      .from('settings')
      .select('config')
      .eq('type', 'company')
      .single();

    const companyData = companySettings?.config || {};

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 15; // Start higher

    // Logo (top right) if available - handle this first
    if (companyData.logo_url) {
      try {
        // Only accept PNG format
        if (companyData.logo_url.includes('data:image/png;base64,')) {
          doc.addImage(companyData.logo_url, 'PNG', pageWidth - 60, 15, 40, 30);
        } else {
          console.warn('Logo format not supported. Only PNG format is accepted.');
        }
      } catch (logoError) {
        console.warn('Could not add logo to PDF:', logoError);
      }
    }

    // Company header (left side)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(companyData.nom_societe || 'MZN TRANSPORT', 20, currentY);
    
    currentY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (companyData.adresse) {
      doc.text(companyData.adresse, 20, currentY);
      currentY += 4;
    }
    
    if (companyData.code_postal && companyData.ville) {
      doc.text(`${companyData.code_postal} ${companyData.ville}`, 20, currentY);
      currentY += 4;
    }

    // Add SIRET if available
    if (companyData.siret) {
      doc.text(`SIRET: ${companyData.siret}`, 20, currentY);
      currentY += 4;
    }

    // Add TVA number if available
    if (companyData.numero_tva) {
      doc.text(`N° TVA: ${companyData.numero_tva}`, 20, currentY);
      currentY += 4;
    }
    
    if (companyData.telephone) {
      doc.text(`Tél: ${companyData.telephone}`, 20, currentY);
      currentY += 4;
    }
    
    if (companyData.email) {
      doc.text(`Email: ${companyData.email}`, 20, currentY);
      currentY += 4;
    }

    // Invoice title and number - moved up and centered at top
    currentY = Math.max(currentY, 50); // Ensure we're below logo area
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 8;
    doc.setFontSize(12);
    doc.text(`N° ${numero}`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, pageWidth / 2, currentY, { align: 'center' });

    // Client information - complete details with all available information
    currentY += 15; // Reduced from 20
    doc.setFont('helvetica', 'bold');
    doc.text('Facturé à:', 20, currentY);
    
    currentY += 6; // Reduced from 8
    doc.setFont('helvetica', 'normal');
    
    // Use clientData if available, otherwise fallback to slip.client
    const client = clientData || slip.client;
    
    // Client name - ONLY ONCE
    if (!client.adresse_facturation?.startsWith(client.nom)) {
      doc.text(client.nom, 20, currentY);
      currentY += 5;
    }
    
    // Client billing address - COMPLETE ADDRESS
    if (client?.adresse_facturation) {
      // Split address into multiple lines if it's too long
      const addressLines = doc.splitTextToSize(client.adresse_facturation, 120);
      doc.text(addressLines, 20, currentY);
      currentY += addressLines.length * 5;
    }

    // Client SIRET if available
    if (client?.siret) {
      doc.text(`SIRET: ${client.siret}`, 20, currentY);
      currentY += 5;
    }

    // Client VAT number if available
    if (client?.numero_tva) {
      doc.text(`N° TVA: ${client.numero_tva}`, 20, currentY);
      currentY += 5;
    }

    // Client email
    if (client?.email) {
      doc.text(`Email: ${client.email}`, 20, currentY);
      currentY += 5;
    }

    // Client phone (with fallback check)
    if (client?.telephone) {
      doc.text(`Tél: ${client.telephone}`, 20, currentY);
      currentY += 5;
    }

    // Extract cities from addresses
    const loadingCity = extractCityFromAddress(slip.loading_address);
    const deliveryCity = extractCityFromAddress(slip.delivery_address);

    // Service description section with reduced spacing
    currentY += 15; // Reduced from 20
    doc.setFont('helvetica', 'bold');
    doc.text('Description du service:', 20, currentY);
    
    currentY += 8; // Reduced from 10
    doc.setFont('helvetica', 'normal');
    
    // Use custom description for manual invoices or default transport description
    let description;
    if (slip.goods_description && slip.goods_description !== 'FACTURE MANUELLE') {
      description = slip.goods_description;
    } else {
      description = `TRANSPORT ALL IN – ${loadingCity} / ${deliveryCity}`;
    }
    
    doc.text(description, 20, currentY);
    
    currentY += 6; // Reduced from 8
    doc.text(`Bordereau: ${slip.number}`, 20, currentY);
    
    // Add client order number if it exists
    if ((slip as any).order_number) {
      currentY += 5;
      doc.text(`Commande client: ${(slip as any).order_number}`, 20, currentY);
    }
    
    currentY += 5; // Reduced from 6
    doc.text(`Date de transport: ${format(new Date(slip.loading_date), 'dd/MM/yyyy', { locale: fr })}`, 20, currentY);

    // Amounts table with reduced spacing
    currentY += 20; // Reduced from 25
    
    // Table headers
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 20, currentY);
    doc.text('Montant HT', 120, currentY);
    doc.text('TVA', 150, currentY);
    doc.text('Montant TTC', 170, currentY);
    
    // Line under headers
    currentY += 2;
    doc.line(20, currentY, 190, currentY);
    
    // Table content with text wrapping
    currentY += 8; // Reduced from 10
    doc.setFont('helvetica', 'normal');
    
    // Use splitTextToSize to wrap the description text
    const wrappedDescription = doc.splitTextToSize(description, 90);
    doc.text(wrappedDescription, 20, currentY);
    
    // Place amounts on the first line of the description
    doc.text(`${montant_ht.toFixed(2)} €`, 120, currentY);
    doc.text(`${tva.toFixed(2)} €`, 150, currentY);
    doc.text(`${montant_ttc.toFixed(2)} €`, 170, currentY);
    
    // Adjust currentY based on the number of lines in the wrapped description
    currentY += wrappedDescription.length * 5; // Reduced from 6
    
    // Total line
    currentY += 6; // Reduced from 8
    doc.line(20, currentY, 190, currentY);
    
    currentY += 8; // Reduced from 10
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL À PAYER:', 120, currentY);
    doc.text(`${montant_ttc.toFixed(2)} €`, 170, currentY);

    // Payment terms
    currentY += 15; // Reduced from 20
    doc.setFont('helvetica', 'normal');
    doc.text('Conditions de paiement: 30 jours à réception de facture', 20, currentY);

    // Bank details (RIB) if available - Check if we need a new page
    if (companyData.rib_iban || companyData.rib_bic || companyData.rib_banque) {
      // Check if we have enough space for bank details (need about 30 units)
      if (currentY > 250) { // Moved up from 260
        doc.addPage();
        currentY = 20;
      }
      
      currentY += 15; // Reduced from 20
      doc.setFont('helvetica', 'bold');
      doc.text('Coordonnées bancaires:', 20, currentY);
      
      currentY += 6; // Reduced from 8
      doc.setFont('helvetica', 'normal');
      
      if (companyData.rib_banque) {
        doc.text(`Banque: ${companyData.rib_banque}`, 20, currentY);
        currentY += 4; // Reduced from 5
      }
      
      if (companyData.rib_iban) {
        doc.text(`IBAN: ${companyData.rib_iban}`, 20, currentY);
        currentY += 4;
      }
      
      if (companyData.rib_bic) {
        doc.text(`BIC: ${companyData.rib_bic}`, 20, currentY);
        currentY += 4;
      }
    }

    // Legal mentions if available - Check if we need a new page
    if (companyData.mentions_legales) {
      // Check if we have enough space for legal mentions (need about 35 units)
      if (currentY > 235) { // Moved up from 240
        doc.addPage();
        currentY = 20;
      }
      
      currentY += 12; // Reduced from 15
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(companyData.mentions_legales, pageWidth - 40);
      doc.text(splitText, 20, currentY);
    }

    return doc.output('blob');
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
}

// New function to generate a PDF for grouped invoices
export async function generateGroupedInvoicePDF(
  slips: (TransportSlip | FreightSlip)[],
  type: 'transport' | 'freight',
  numero: string,
  montant_ht: number,
  tva: number,
  montant_ttc: number,
  clientData?: any
): Promise<Blob> {
  try {
    // Get company data from settings
    const { data: companySettings } = await supabase
      .from('settings')
      .select('config')
      .eq('type', 'company')
      .single();

    const companyData = companySettings?.config || {};

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 15; // Start higher

    // Logo (top right) if available - handle this first
    if (companyData.logo_url) {
      try {
        // Only accept PNG format
        if (companyData.logo_url.includes('data:image/png;base64,')) {
          doc.addImage(companyData.logo_url, 'PNG', pageWidth - 60, 15, 40, 30);
        } else {
          console.warn('Logo format not supported. Only PNG format is accepted.');
        }
      } catch (logoError) {
        console.warn('Could not add logo to PDF:', logoError);
      }
    }

    // Company header (left side)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(companyData.nom_societe || 'MZN TRANSPORT', 20, currentY);
    
    currentY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (companyData.adresse) {
      doc.text(companyData.adresse, 20, currentY);
      currentY += 4;
    }
    
    if (companyData.code_postal && companyData.ville) {
      doc.text(`${companyData.code_postal} ${companyData.ville}`, 20, currentY);
      currentY += 4;
    }

    // Add SIRET if available
    if (companyData.siret) {
      doc.text(`SIRET: ${companyData.siret}`, 20, currentY);
      currentY += 4;
    }

    // Add TVA number if available
    if (companyData.numero_tva) {
      doc.text(`N° TVA: ${companyData.numero_tva}`, 20, currentY);
      currentY += 4;
    }
    
    if (companyData.telephone) {
      doc.text(`Tél: ${companyData.telephone}`, 20, currentY);
      currentY += 4;
    }
    
    if (companyData.email) {
      doc.text(`Email: ${companyData.email}`, 20, currentY);
      currentY += 4;
    }

    // Invoice title and number - moved up and centered at top
    currentY = Math.max(currentY, 50); // Ensure we're below logo area
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 8;
    doc.setFontSize(12);
    doc.text(`N° ${numero}`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, pageWidth / 2, currentY, { align: 'center' });

    // Client information - complete details with all available information
    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Facturé à:', 20, currentY);
    
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    
    // Use clientData if available
    const client = clientData;
    
    // Client name - ONLY ONCE
    if (!client.adresse_facturation?.startsWith(client.nom)) {
      doc.text(client.nom, 20, currentY);
      currentY += 5;
    }
    
    // Client billing address - COMPLETE ADDRESS
    if (client?.adresse_facturation) {
      // Split address into multiple lines if it's too long
      const addressLines = doc.splitTextToSize(client.adresse_facturation, 120);
      doc.text(addressLines, 20, currentY);
      currentY += addressLines.length * 5;
    }

    // Client SIRET if available
    if (client?.siret) {
      doc.text(`SIRET: ${client.siret}`, 20, currentY);
      currentY += 5;
    }

    // Client VAT number if available
    if (client?.numero_tva) {
      doc.text(`N° TVA: ${client.numero_tva}`, 20, currentY);
      currentY += 5;
    }

    // Client email
    if (client?.email) {
      doc.text(`Email: ${client.email}`, 20, currentY);
      currentY += 5;
    }

    // Client phone (with fallback check)
    if (client?.telephone) {
      doc.text(`Tél: ${client.telephone}`, 20, currentY);
      currentY += 5;
    }

    // Service description section
    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Détail des prestations:', 20, currentY);
    
    currentY += 8;
    
    // Table headers
    doc.setFontSize(10);
    doc.text('Bordereau', 20, currentY);
    doc.text('Références', 55, currentY);
    doc.text('Date', 85, currentY);
    doc.text('Description', 105, currentY);
    doc.text('Montant HT', 170, currentY);
    
    // Line under headers
    currentY += 2;
    doc.line(20, currentY, 190, currentY);
    currentY += 6;
    
    // List all slips in the table
    doc.setFont('helvetica', 'normal');
    
    for (const slip of slips) {
      // Check if we need a new page
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
        
        // Repeat headers on new page
        doc.setFont('helvetica', 'bold');
        doc.text('Bordereau', 20, currentY);
        doc.text('Date', 55, currentY);
        doc.text('Description', 75, currentY);
        doc.text('Références', 140, currentY);
        doc.text('Montant HT', 170, currentY);
        
        // Line under headers
        currentY += 2;
        doc.line(20, currentY, 190, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
      }
      
      // Slip number
      doc.text(slip.number, 20, currentY);
      
      // Client order number (Références column)
      const orderNumber = (slip as any).order_number || '-';
      doc.text(orderNumber, 55, currentY);
      
      // Slip date
      const slipDate = format(new Date(slip.loading_date), 'dd/MM/yyyy', { locale: fr });
      doc.text(slipDate, 85, currentY);
      
      // Description (truncated if needed)
      const description = slip.goods_description || 'Transport';
      const truncatedDesc = description.length > 40 ? description.substring(0, 37) + '...' : description;
      doc.text(truncatedDesc, 105, currentY);
      
      // Amount
      const slipAmount = type === 'transport'
        ? (slip as TransportSlip).price
        : ((slip as FreightSlip).selling_price || 0);
      doc.text(`${slipAmount.toFixed(2)} €`, 170, currentY);
      
      currentY += 6;
    }
    
    // Totals section
    currentY += 6;
    doc.line(20, currentY, 190, currentY);
    currentY += 8;
    
    // Subtotal
    doc.setFont('helvetica', 'bold');
    doc.text('Total HT:', 140, currentY);
    doc.text(`${montant_ht.toFixed(2)} €`, 170, currentY);
    currentY += 6;
    
    // VAT
    doc.text(`TVA (${clientData?.tva_rate || 20}%)`, 140, currentY);
    doc.text(`${tva.toFixed(2)} €`, 170, currentY);
    currentY += 6;
    
    // Total
    doc.setFontSize(12);
    doc.text('TOTAL TTC:', 140, currentY);
    doc.text(`${montant_ttc.toFixed(2)} €`, 170, currentY);

    // Payment terms
    currentY += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Conditions de paiement: 30 jours à réception de facture', 20, currentY);

    // Bank details (RIB) if available - Check if we need a new page
    if (companyData.rib_iban || companyData.rib_bic || companyData.rib_banque) {
      // Check if we have enough space for bank details (need about 30 units)
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      currentY += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('Coordonnées bancaires:', 20, currentY);
      
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      
      if (companyData.rib_banque) {
        doc.text(`Banque: ${companyData.rib_banque}`, 20, currentY);
        currentY += 4;
      }
      
      if (companyData.rib_iban) {
        doc.text(`IBAN: ${companyData.rib_iban}`, 20, currentY);
        currentY += 4;
      }
      
      if (companyData.rib_bic) {
        doc.text(`BIC: ${companyData.rib_bic}`, 20, currentY);
        currentY += 4;
      }
    }

    // Legal mentions if available - Check if we need a new page
    if (companyData.mentions_legales) {
      // Check if we have enough space for legal mentions (need about 35 units)
      if (currentY > 235) {
        doc.addPage();
        currentY = 20;
      }
      
      currentY += 12;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(companyData.mentions_legales, pageWidth - 40);
      doc.text(splitText, 20, currentY);
    }

    return doc.output('blob');
  } catch (error) {
    console.error('Error generating grouped invoice PDF:', error);
    throw error;
  }
}

function extractCityFromAddress(address: string): string {
  // Extract city from address format: "Company, Street, PostalCode City"
  const parts = address.split(',');
  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1].trim();
    // Remove postal code (first word) to get city
    const words = lastPart.split(' ');
    return words.slice(1).join(' ') || 'Ville';
  }
  return 'Ville';
}

export async function getAllInvoices(): Promise<ClientInvoice[]> {
  await assertNotExploitForbidden();
  const { data, error } = await supabase
    .from('client_invoices')
    .select(`
  *,
  client:client_id (
    id,
    nom,
    email,
    adresse_facturation,
    telephone,
    client_accounting_contacts (
      id,
      nom,
      email
    )
  )
`)

    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Error fetching invoices: ${error.message}`);
  }

  return data || [];
}

export async function updateInvoiceStatus(id: string, statut: 'en_attente' | 'paye'): Promise<void> {
  await assertNotExploitForbidden();
  const { error } = await supabase
    .from('client_invoices')
    .update({ statut })
    .eq('id', id);

  if (error) {
    throw new Error(`Error updating invoice status: ${error.message}`);
  }
}

// Helper function to extract relative path from full URL
function extractRelativePathFromUrl(urlOrPath: string): string {
  // If it's already a relative path, return as is
  if (!urlOrPath.startsWith('http')) {
    return urlOrPath;
  }
  
  try {
    const url = new URL(urlOrPath);
    // Extract path after '/storage/v1/object/public/documents/'
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/documents\/(.+)$/);
    if (pathMatch) {
      return pathMatch[1];
    }
    
    // Fallback: try to extract anything after 'documents/'
    const documentsIndex = url.pathname.indexOf('documents/');
    if (documentsIndex !== -1) {
      return url.pathname.substring(documentsIndex + 'documents/'.length);
    }
    
    // If we can't extract a proper path, throw an error
    throw new Error('Unable to extract relative path from URL');
  } catch (error) {
    console.error('Error parsing URL:', error);
    throw new Error('Invalid URL format');
  }
}

// Function to download CMR PDF using signed URL
export async function downloadCMRPDF(lienCmr: string): Promise<void> {
  await assertNotExploitForbidden();
  try {
    if (!lienCmr) {
      throw new Error('Aucun CMR disponible');
    }

    // Extract relative path from URL if needed
    const relativePath = extractRelativePathFromUrl(lienCmr);

    // Generate a signed URL for download (valid for 60 seconds)
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(relativePath, 60);

    if (error) {
      throw new Error(`Erreur lors de la génération du lien de téléchargement: ${error.message}`);
    }

    if (!data?.signedUrl) {
      throw new Error('Impossible de générer le lien de téléchargement');
    }

    // Open the signed URL in a new tab
    window.open(data.signedUrl, '_blank');
  } catch (error) {
    console.error('Error downloading CMR PDF:', error);
    throw error;
  }
}
// Function to download invoice PDF directly (same system as slips)
export async function downloadInvoicePDF(invoice: ClientInvoice): Promise<void> {
  await assertNotExploitForbidden();
  try {
    if (!invoice.lien_pdf) {
      throw new Error('Aucun PDF disponible pour cette facture');
    }

    // Extract relative path from URL if needed
    const relativePath = extractRelativePathFromUrl(invoice.lien_pdf);

    // Generate a signed URL for download (valid for 60 seconds)
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(relativePath, 60);

    if (error) {
      throw new Error(`Erreur lors de la génération du lien de téléchargement: ${error.message}`);
    }

    if (!data?.signedUrl) {
      throw new Error('Impossible de générer le lien de téléchargement');
    }

    // Open the signed URL in a new tab
    window.open(data.signedUrl, '_blank');
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    throw error;
  }
}

// Function to check if an invoice exists for a slip
export async function checkInvoiceExists(bordereauId: string, bordereauType: 'transport' | 'freight'): Promise<boolean> {
  try {
    // First check direct invoice references
    const { data: directInvoice, error: directError } = await supabase
      .from('client_invoices')
      .select('id')
      .eq('bordereau_id', bordereauId)
      .eq('bordereau_type', bordereauType)
      .limit(1);

    if (directError) {
      console.error('Error checking direct invoice existence:', directError);
      return false;
    }

    if (directInvoice && directInvoice.length > 0) {
      return true;
    }

    // Then check invoice references table for grouped invoices
    const { data: references, error: refError } = await supabase
      .from('invoice_slip_references')
      .select('invoice_id')
      .eq('slip_id', bordereauId)
      .eq('slip_type', bordereauType)
      .limit(1);

    if (refError) {
      console.error('Error checking invoice references:', refError);
      return false;
    }

    return references && references.length > 0;
  } catch (error) {
    console.error('Error checking invoice existence:', error);
    return false;
  }
}
