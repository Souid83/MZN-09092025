import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { FreightPDF } from '../../pdf/FreightPDF';
import type { FreightSlip } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const downloadFreightPDF = async (slip: FreightSlip): Promise<void> => {
  try {
    // Generate the PDF blob
    const blob = await pdf(<FreightPDF slip={slip} />).toBlob();
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `Affretement_${slip.clients?.nom || 'Client'}_${format(new Date(slip.loading_date), 'dd-MM-yyyy', { locale: fr })}.pdf`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};