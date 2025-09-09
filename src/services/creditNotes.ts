import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CreditNote, ClientInvoice } from '../types';

export async function generateCreditNoteNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  // Get the current credit note count for this month
  const { data: creditNotes, error } = await supabase
    .from('credit_notes')
    .select('numero')
    .like('numero', `A${year}${month}-%`)
    .order('numero', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Error fetching credit note numbers: ${error.message}`);
  }

  let nextNumber = 1;
  if (creditNotes && creditNotes.length > 0) {
    const lastNumber = creditNotes[0].numero.split('-')[1];
    nextNumber = parseInt(lastNumber) + 1;
  }

  return `A${year}${month}-${nextNumber.toString().padStart(3, '0')}`;
}

export async function getAllCreditNotes(): Promise<CreditNote[]> {
  const { data, error } = await supabase
    .from('credit_notes')
    .select(`
      *,
      client:client_id(nom, email, adresse_facturation, telephone),
      invoice:invoice_id(numero)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Error fetching credit notes: ${error.message}`);
  }

  return data || [];
}

export async function getInvoiceDetails(invoiceId: string): Promise<ClientInvoice> {
  const { data, error } = await supabase
    .from('client_invoices')
    .select(`
      *,
      client:client_id(nom, email, adresse_facturation, telephone, siret, numero_tva, tva_rate)
    `)
    .eq('id', invoiceId)
    .single();

  if (error) {
    throw new Error(`Error fetching invoice details: ${error.message}`);
  }

  return data;
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<ClientInvoice | null> {
  const { data, error } = await supabase
    .from('client_invoices')
    .select(`
      *,
      client:client_id(nom, email, adresse_facturation, telephone, siret, numero_tva, tva_rate)
    `)
    .eq('numero', invoiceNumber)
    .maybeSingle();

  if (error) {
    throw new Error(`Error fetching invoice by number: ${error.message}`);
  }

  return data;
}

export async function updateCreditNoteStatus(id: string, statut: 'emis' | 'comptabilise'): Promise<void> {
  const { error } = await supabase
    .from('credit_notes')
    .update({ statut })
    .eq('id', id);

  if (error) {
    throw new Error(`Error updating credit note status: ${error.message}`);
  }
}

export async function generateCreditNotePDF(
  creditNoteData: {
    numero: string;
    invoice_numero?: string;
    motif: string;
    montant_ht: number;
    tva: number;
    montant_ttc: number;
    date_emission: string;
  },
  clientData: any
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

    // Credit note title and number - moved up and centered at top
    currentY = Math.max(currentY, 50); // Ensure we're below logo area
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('AVOIR', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 8;
    doc.setFontSize(12);
    doc.text(`N° ${creditNoteData.numero}`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(creditNoteData.date_emission), 'dd/MM/yyyy', { locale: fr })}`, pageWidth / 2, currentY, { align: 'center' });

    // Client information
    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Client:', 20, currentY);
    
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

    // Reference to original invoice (if available)
    if (creditNoteData.invoice_numero) {
      currentY += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Référence facture d\'origine:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(creditNoteData.invoice_numero, 20, currentY);
    }

    // Reason for credit note
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Motif de l\'avoir:', 20, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    
    // Wrap the reason text
    const wrappedReason = doc.splitTextToSize(creditNoteData.motif, 170);
    doc.text(wrappedReason, 20, currentY);
    currentY += wrappedReason.length * 5 + 10;

    // Amounts table
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
    const description = creditNoteData.invoice_numero 
      ? `Avoir sur facture ${creditNoteData.invoice_numero}`
      : `Avoir client ${clientData.nom}`;
    const wrappedDescription = doc.splitTextToSize(description, 90);
    doc.text(wrappedDescription, 20, currentY);
    
    // Place amounts on the first line of the description
    // Use negative values for credit notes
    doc.text(`-${creditNoteData.montant_ht.toFixed(2)} €`, 120, currentY);
    doc.text(`-${creditNoteData.tva.toFixed(2)} €`, 150, currentY);
    doc.text(`-${creditNoteData.montant_ttc.toFixed(2)} €`, 170, currentY);
    
    // Adjust currentY based on the number of lines in the wrapped description
    currentY += wrappedDescription.length * 5;
    
    // Total line
    currentY += 6;
    doc.line(20, currentY, 190, currentY);
    
    currentY += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AVOIR:', 120, currentY);
    doc.text(`-${creditNoteData.montant_ttc.toFixed(2)} €`, 170, currentY);

    // Legal mentions if available
    if (companyData.mentions_legales) {
      // Check if we have enough space for legal mentions (need about 35 units)
      if (currentY > 235) {
        doc.addPage();
        currentY = 20;
      }
      
      currentY += 20;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(companyData.mentions_legales, pageWidth - 40);
      doc.text(splitText, 20, currentY);
    }

    return doc.output('blob');
  } catch (error) {
    console.error('Error generating credit note PDF:', error);
    throw error;
  }
}

export async function createCreditNote(
  invoiceId: string,
  motif: string,
  montant_ht: number,
  isPartial: boolean,
  clientId?: string
): Promise<CreditNote> {
  try {
    let invoice: ClientInvoice | null = null;
    let client_id: string;
    let tva_rate: number = 20;
    let invoice_numero: string | undefined;

    if (invoiceId) {
      // Get invoice details
      invoice = await getInvoiceDetails(invoiceId);
      client_id = invoice.client_id;
      tva_rate = invoice.client?.tva_rate || 20;
      invoice_numero = invoice.numero;
      
      // Validate amounts for invoice-linked credit notes
      if (montant_ht <= 0) {
        throw new Error('Le montant HT doit être supérieur à 0');
      }
      
      if (!isPartial && montant_ht > invoice.montant_ht) {
        throw new Error('Le montant de l\'avoir ne peut pas dépasser le montant de la facture');
      }
    } else if (clientId) {
      // For client-only credit notes
      client_id = clientId;
      
      // Get client TVA rate
      const { data: clientData } = await supabase
        .from('clients')
        .select('tva_rate')
        .eq('id', clientId)
        .single();
        
      tva_rate = clientData?.tva_rate || 20;
      
      if (montant_ht <= 0) {
        throw new Error('Le montant HT doit être supérieur à 0');
      }
    } else {
      throw new Error('Vous devez spécifier soit une facture, soit un client');
    }
    
    // Calculate TVA and TTC
    const tva = montant_ht * (tva_rate / 100);
    const montant_ttc = montant_ht + tva;
    
    // Generate credit note number
    const numero = await generateCreditNoteNumber();
    
    // Generate PDF
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();
      
    const pdfBlob = await generateCreditNotePDF(
      {
        numero,
        invoice_numero,
        motif,
        montant_ht,
        tva,
        montant_ttc,
        date_emission: format(new Date(), 'yyyy-MM-dd')
      },
      clientData
    );
    
    // Upload PDF to storage
    const pdfFileName = `credit-note-${numero.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    const pdfPath = `credit-notes/${pdfFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(pdfPath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Erreur lors de l'upload du PDF: ${uploadError.message}`);
    }
    
    // Create credit note record
    const creditNoteData = {
      numero,
      invoice_id: invoiceId || null,
      client_id,
      date_emission: format(new Date(), 'yyyy-MM-dd'),
      montant_ht,
      tva,
      montant_ttc,
      motif,
      lien_pdf: pdfPath,
      statut: 'emis' as const
    };

    const { data: creditNote, error } = await supabase
      .from('credit_notes')
      .insert([creditNoteData])
      .select(`
        *,
        client:client_id(nom, email, adresse_facturation, telephone),
        invoice:invoice_id(numero)
      `)
      .single();

    if (error) {
      throw new Error(`Erreur lors de l'enregistrement: ${error.message}`);
    }

    return creditNote;
  } catch (error) {
    console.error('Error creating credit note:', error);
    throw error;
  }
}

export async function downloadCreditNotePDF(creditNote: CreditNote): Promise<void> {
  try {
    if (!creditNote.lien_pdf) {
      throw new Error('Aucun PDF disponible pour cet avoir');
    }

    // Extract relative path from URL if needed
    const relativePath = extractRelativePathFromUrl(creditNote.lien_pdf);

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
    console.error('Error downloading credit note PDF:', error);
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