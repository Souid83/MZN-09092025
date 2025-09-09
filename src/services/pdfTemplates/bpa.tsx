import { supabase } from '../../lib/supabase';
import type { FreightSlip } from '../../types';
import { generatePDF } from '../slips';

export const generateAndSaveBPA = async (slip: FreightSlip): Promise<string> => {
  try {
    // Generate the PDF blob
    const blob = await generatePDF(slip, 'freight');
    
    // Create file name
    const fileName = `BPA-${slip.number.replace(/\s/g, '')}.pdf`;
    const filePath = `freight/${slip.id}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Update slip documents
    const { data: currentData } = await supabase
      .from('freight_slips')
      .select('documents')
      .eq('id', slip.id)
      .single();

    const currentDocs = currentData?.documents || {};
    const updatedDocs = {
      ...currentDocs,
      bpa: {
        url: publicUrl,
        uploaded_at: new Date().toISOString()
      }
    };

    const { error: updateError } = await supabase
      .from('freight_slips')
      .update({ documents: updatedDocs })
      .eq('id', slip.id);

    if (updateError) throw updateError;

    return publicUrl;
  } catch (error) {
    console.error('Error generating BPA:', error);
    throw error;
  }
};

export const generateAndSaveBonDeCommande = async (slip: FreightSlip): Promise<string> => {
  try {
    // Generate the PDF blob with client info instead of transporteur
    const blob = await generatePDF({ ...slip, fournisseurs: slip.clients }, 'freight');
    
    // Create file name
    const fileName = `BonDeCommande-${slip.number.replace(/\s/g, '')}.pdf`;
    const filePath = `freight/${slip.id}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Update slip documents
    const { data: currentData } = await supabase
      .from('freight_slips')
      .select('documents')
      .eq('id', slip.id)
      .single();

    const currentDocs = currentData?.documents || {};
    const updatedDocs = {
      ...currentDocs,
      bonDeCommande: {
        url: publicUrl,
        uploaded_at: new Date().toISOString()
      }
    };

    const { error: updateError } = await supabase
      .from('freight_slips')
      .update({ documents: updatedDocs })
      .eq('id', slip.id);

    if (updateError) throw updateError;

    return publicUrl;
  } catch (error) {
    console.error('Error generating Bon de Commande:', error);
    throw error;
  }
};

export const downloadBPA = async (
  slip: FreightSlip,
  type: 'bpa' | 'bonDeCommande' = 'bpa'
): Promise<void> => {
  try {
    let url: string;
    let updatedSlip = slip;

    // Check if document already exists
    if (slip.documents?.[type]?.url) {
      url = slip.documents[type].url;
    } else {
      // Generate new document if it doesn't exist
      url = await (type === 'bpa' 
        ? generateAndSaveBPA(slip)
        : generateAndSaveBonDeCommande(slip));

      // Get updated slip data to ensure we have latest document URLs
      const { data: refreshedSlip, error } = await supabase
        .from('freight_slips')
        .select('*')
        .eq('id', slip.id)
        .single();

      if (error) throw error;
      updatedSlip = refreshedSlip;
    }

    // Create filename based on type
    const filename = type === 'bpa'
      ? `BPA-${updatedSlip.number.replace(/\s/g, '')}.pdf`
      : `BonDeCommande-${updatedSlip.number.replace(/\s/g, '')}.pdf`;

    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error(`Error downloading ${type}:`, error);
    throw error;
  }
};