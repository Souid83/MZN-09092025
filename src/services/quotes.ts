import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClientQuote, Client } from '../types';

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
    // fail-open to avoid breaking non-exploitation roles if lookup fails
  }
}

export async function generateQuoteNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  // Get the current quote count for this month
  const { data: quotes, error } = await supabase
    .from('client_quotes')
    .select('numero')
    .like('numero', `D${year}${month}-%`)
    .order('numero', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Error fetching quote numbers: ${error.message}`);
  }

  let nextNumber = 1;
  if (quotes && quotes.length > 0) {
    const lastNumber = quotes[0].numero.split('-')[1];
    nextNumber = parseInt(lastNumber) + 1;
  }

  return `D${year}${month}-${nextNumber.toString().padStart(2, '0')}`;
}

export async function getAllQuotes(): Promise<ClientQuote[]> {
  // Base query
  let query = supabase
    .from('client_quotes')
    .select(`
      *,
      client:client_id(nom, email, adresse_facturation, telephone)
    `)
    .order('created_at', { ascending: false });

  // Restrict to own quotes for EXPLOITATION users
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
      if (roleUpper === 'EXPLOIT' || roleUpper === 'EXPLOITATION') {
        query = query.eq('created_by', userId);
      }
    }
  } catch {
    // ignore filtering if session lookup fails
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching quotes: ${error.message}`);
  }

  return data || [];
}

export async function updateQuoteStatus(id: string, statut: 'en_attente' | 'accepte' | 'refuse' | 'facture'): Promise<void> {
  const { error } = await supabase
    .from('client_quotes')
    .update({ statut })
    .eq('id', id);

  if (error) {
    throw new Error(`Error updating quote status: ${error.message}`);
  }
}

export async function generateQuotePDF(
  quoteData: {
    numero: string;
    description: string;
    montant_ht: number;
    tva: number;
    montant_ttc: number;
    date_emission: string;
  },
  clientData: Client
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

    // Quote title and number - moved up and centered at top
    currentY = Math.max(currentY, 50); // Ensure we're below logo area
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('DEVIS', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 8;
    doc.setFontSize(12);
    doc.text(`N° ${quoteData.numero}`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(quoteData.date_emission), 'dd/MM/yyyy', { locale: fr })}`, pageWidth / 2, currentY, { align: 'center' });

    // Client information
    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Devis pour:', 20, currentY);
    
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    
    // Client name - ONLY ONCE
    if (!clientData.adresse_facturation?.startsWith(clientData.nom)) {
      doc.text(clientData.nom, 20, currentY);
      currentY += 5;
    }
    
    // Client billing address - COMPLETE ADDRESS
    if (clientData?.adresse_facturation) {
      // Split address into multiple lines if it's too long
      const addressLines = doc.splitTextToSize(clientData.adresse_facturation, 120);
      doc.text(addressLines, 20, currentY);
      currentY += addressLines.length * 5;
    }

    // Client SIRET if available
    if (clientData?.siret) {
      doc.text(`SIRET: ${clientData.siret}`, 20, currentY);
      currentY += 5;
    }

    // Client VAT number if available
    if (clientData?.numero_tva) {
      doc.text(`N° TVA: ${clientData.numero_tva}`, 20, currentY);
      currentY += 5;
    }

    // Service description section
    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Description du service:', 20, currentY);
    
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    
    // Description with text wrapping
    const wrappedDescription = doc.splitTextToSize(quoteData.description, 170);
    doc.text(wrappedDescription, 20, currentY);
    
    // Adjust currentY based on the number of lines in the wrapped description
    currentY += wrappedDescription.length * 5;

    // Amounts table
    currentY += 20;
    
    // Table headers
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 20, currentY);
    doc.text('Montant HT', 120, currentY);
    doc.text('TVA', 150, currentY);
    doc.text('Montant TTC', 170, currentY);
    
    // Line under headers
    currentY += 2;
    doc.line(20, currentY, 190, currentY);
    
    // Table content
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    
    // Use splitTextToSize to wrap the description text
    const wrappedTableDesc = doc.splitTextToSize(quoteData.description, 90);
    doc.text(wrappedTableDesc, 20, currentY);
    
    // Place amounts on the first line of the description
    doc.text(`${quoteData.montant_ht.toFixed(2)} €`, 120, currentY);
    doc.text(`${quoteData.tva.toFixed(2)} €`, 150, currentY);
    doc.text(`${quoteData.montant_ttc.toFixed(2)} €`, 170, currentY);
    
    // Adjust currentY based on the number of lines in the wrapped description
    currentY += wrappedTableDesc.length * 5;
    
    // Total line
    currentY += 6;
    doc.line(20, currentY, 190, currentY);
    
    currentY += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 120, currentY);
    doc.text(`${quoteData.montant_ttc.toFixed(2)} €`, 170, currentY);

    // Validity period
    currentY += 15;
    doc.setFont('helvetica', 'normal');
    doc.text('Validité du devis: 30 jours à compter de la date d\'émission', 20, currentY);

    // Payment terms
    currentY += 8;
    doc.text('Conditions de paiement: 30 jours à réception de facture', 20, currentY);

    // Bank details (RIB) if available
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

    // Legal mentions if available
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
    console.error('Error generating quote PDF:', error);
    throw error;
  }
}

export async function downloadQuotePDF(quote: ClientQuote): Promise<void> {
  try {
    if (!quote.lien_pdf) {
      throw new Error('Aucun PDF disponible pour ce devis');
    }

    // Extract relative path from URL if needed
    const relativePath = extractRelativePathFromUrl(quote.lien_pdf);

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
    console.error('Error downloading quote PDF:', error);
    throw error;
  }
}

export async function convertQuoteToInvoice(quote: ClientQuote): Promise<string> {
  await assertNotExploitForbidden();
  try {
    // Import the invoice service functions
    const { generateInvoiceNumber } = await import('./invoices');
    
    // Generate a new invoice number
    const invoiceNumber = await generateInvoiceNumber();
    
    // Create invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('client_invoices')
      .insert([{
        numero: invoiceNumber,
        client_id: quote.client_id,
        bordereau_id: null,
        bordereau_type: 'transport', // Default type
        type: 'facture_devis',
        date_emission: format(new Date(), 'yyyy-MM-dd'),
        montant_ht: quote.montant_ht,
        tva: quote.tva,
        montant_ttc: quote.montant_ttc,
        lien_pdf: quote.lien_pdf, // Reuse the same PDF initially
        statut: 'en_attente',
        metadata: { quote_id: quote.id }
      }])
      .select()
      .single();
    
    if (invoiceError) {
      throw new Error(`Error creating invoice: ${invoiceError.message}`);
    }
    
    // Update quote status and link to invoice
    const { error: updateError } = await supabase
      .from('client_quotes')
      .update({
        statut: 'facture',
        invoice_id: invoice.id
      })
      .eq('id', quote.id);
    
    if (updateError) {
      throw new Error(`Error updating quote: ${updateError.message}`);
    }
    
    return invoice.id;
  } catch (error) {
    console.error('Error converting quote to invoice:', error);
    throw error;
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
