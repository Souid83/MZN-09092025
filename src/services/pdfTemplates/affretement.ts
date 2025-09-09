import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as svg2pdfjs from 'svg2pdf.js';
import type { FreightSlip } from '../../types';

// Helper function to check if we need a new page
const needsNewPage = (currentY: number, requiredSpace: number, pageHeight: number, margin: number) => {
  return currentY + requiredSpace > pageHeight - margin;
};

export async function generateAffretementPDF(data: FreightSlip): Promise<string> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let currentY = margin;

  // Draw green sidebar
  doc.setFillColor(200, 255, 200);
  doc.rect(0, 0, 40, pageHeight, 'F');

  // Helper functions
  const drawText = (text: string, x: number, y: number, options: any = {}) => {
    const { fontSize = 7, color = 'black', align = 'left', style = 'normal' } = options;
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    doc.setTextColor(color === 'red' ? '#FF0000' : color === 'white' ? '#FFFFFF' : '#000000');
    doc.text(text, x, y, { align });
  };

  // Wrapper pour éviter les textes blancs invisibles
  const safeText = (text: string, x: number, y: number, options: any = {}) => {
    const fixedColor = options.color === 'white' ? 'black' : options.color;
    drawText(text, x, y, { ...options, color: fixedColor });
  };

  const drawRect = (x: number, y: number, w: number, h: number, options: any = {}) => {
    const { fillColor, strokeColor = '#000000' } = options;
    if (fillColor) {
      doc.setFillColor(fillColor);
      doc.rect(x, y, w, h, 'F');
    } else {
      doc.setDrawColor(strokeColor);
      doc.rect(x, y, w, h);
    }
  };

  // Add logo
  try {
    const svgResponse = await fetch('/logo_mzm_transport_cleaned.svg');
    const svgText = await svgResponse.text();
    const container = document.createElement('div');
    container.innerHTML = svgText;
    const svgElement = container.querySelector('svg');

    if (svgElement) {
      const logoWidth = 35;
      const logoHeight = 12;
      const logoX = pageWidth / 2 - logoWidth / 2;
      const logoY = currentY + 2;

      svgElement.setAttribute('width', `${logoWidth}mm`);
      svgElement.setAttribute('height', `${logoHeight}mm`);

      await svg2pdfjs.svg2pdf(svgElement, doc, {
        x: logoX,
        y: logoY,
        width: logoWidth,
        height: logoHeight
      });

      doc.setFont('helvetica');
    }
  } catch (error) {
    console.error('Error loading logo:', error);
  }

  currentY += 5;  // Reduced space after logo

  // Company header in green sidebar - moved up
  const companyStartY = currentY;
  safeText('MZN TRANSPORT', 5, companyStartY, { color: 'black' });
  safeText('12 RUE DES AIRES', 5, companyStartY + 3, { color: 'black' });
  safeText('34430 SAINT JEAN DE VÉDAS', 5, companyStartY + 6, { color: 'black' });
  safeText('FR48911875672', 5, companyStartY + 9, { color: 'black' });
  safeText(data.commercial_id || 'NON RENSEIGNÉ', 5, companyStartY + 12, { color: 'black' });
  safeText('06 89 28 43 07', 5, companyStartY + 15, { color: 'black' });
  const companyBlockEndY = companyStartY + 18;

  // Right header - aligned with company block
  const rightColumn = pageWidth - margin - 55;
  safeText(`Transporteur : ${data.fournisseurs?.nom || 'Non spécifié'}`, rightColumn, companyStartY);
  safeText(`Tél/fax : ${data.fournisseurs?.telephone || 'Non spécifié'}`, rightColumn, companyStartY + 3);
  safeText(`À l'intention de : ${data.clients?.nom || 'Non spécifié'}`, rightColumn, companyStartY + 6);
  safeText(`Date : ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, rightColumn, companyStartY + 9);
  const transporterBlockEndY = companyStartY + 12;

  currentY = Math.max(companyBlockEndY, transporterBlockEndY) + 5;

  // Title and merged reference
  safeText('CONFIRMATION D\'AFFRÈTEMENT', pageWidth / 2, currentY, { 
    fontSize: 14, 
    align: 'center',
    style: 'bold'
  });
  currentY += 7;
  safeText(`Référence à rappeler sur facture : ${data.number || 'Non spécifié'}`, pageWidth / 2, currentY, { 
    align: 'center',
    style: 'bold',
    fontSize: 10
  });
  currentY += 7;
  safeText(
    'IL EST FORMELLEMENT INTERDIT DE MONTRER CETTE COMMANDE À L\'EXPÉDITEUR ET AU DESTINATAIRE',
    pageWidth / 2,
    currentY,
    { align: 'center', fontSize: 8, color: 'red' }
  );
  currentY += 10;

  // Loading and delivery boxes
  const boxHeight = 28; // légèrement réduit
  const boxWidth = (pageWidth - 2 * margin - 10) / 2;

  // Loading box
  drawRect(margin, currentY, boxWidth, boxHeight);
  safeText('Date /heure de chargement', margin + 5, currentY + 7);
  safeText(format(new Date(data.loading_date), 'dd/MM/yyyy', { locale: fr }) + 
    ' ' + data.loading_time, 
    margin + 5, currentY + 13);
  safeText('Adresse de chargement', margin + 5, currentY + 18);
  safeText(data.loading_address || 'Non spécifié', margin + 5, currentY + 23);
  safeText('Contact', margin + 5, currentY + 28);
  safeText(data.loading_contact || 'Non spécifié', margin + 5, currentY + 32);

  // Delivery box
  const rightBox = margin + boxWidth + 10;
  drawRect(rightBox, currentY, boxWidth, boxHeight);
  safeText('Date /heure de livraison', rightBox + 5, currentY + 7);
  safeText(format(new Date(data.delivery_date), 'dd/MM/yyyy', { locale: fr }) + 
    ' ' + data.delivery_time, rightBox + 5, currentY + 13);
  safeText('Adresse de livraison', rightBox + 5, currentY + 18);
  safeText(data.delivery_address || 'Non spécifié', rightBox + 5, currentY + 23);
  safeText('Contact', rightBox + 5, currentY + 28);
  safeText(data.delivery_contact || 'Non spécifié', rightBox + 5, currentY + 32);

  currentY += boxHeight + 1; // on remonte les blocs suivants juste en dessous

  // Combined goods and instructions block - single rectangle
  const goodsBlockStartY = currentY;
  
  // Draw rectangle first
  const goodsBlockHeight = 40; // Fixed height to accommodate all content
  drawRect(margin, goodsBlockStartY, pageWidth - 2 * margin, goodsBlockHeight);
  
  // Goods table
  (doc as any).autoTable({
    startY: currentY + 2,
    head: [['Marchandise', 'Volume', 'Poids', 'Metre', 'Échange']],
    body: [[
      data.goods_description || 'Non spécifié',
      data.volume ? `${data.volume} m³` : '-',
      data.weight ? `${data.weight} kg` : '-',
      '-',
      data.exchange_type || 'Non'
    ]],
    styles: { 
      fontSize: 7,
      cellPadding: 1,
      lineWidth: 0.1
    },
    margin: { top: 1 },
    headStyles: {
      fillColor: [200, 220, 200],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    theme: 'grid'
  });

  currentY = (doc as any).lastAutoTable.finalY + 1;
  safeText('full small truck', margin + 5, currentY, { fontSize: 7, style: 'italic' });
  currentY += 3;

  // Instructions
  safeText('CONSIGNES', margin + 5, currentY + 3);
  safeText('', pageWidth / 2, currentY + 8, { 
    color: 'red',
    align: 'center',
    style: 'bold'
  });

  currentY = goodsBlockStartY + goodsBlockHeight + 5;

  // Combined price and payment block - single rectangle
  const priceBlockStartY = currentY;
  const priceBlockHeight = 12;
  
  // Draw rectangle first
  drawRect(margin, priceBlockStartY, pageWidth - 2 * margin, priceBlockHeight);
  
  // Left price section
  safeText('Prix de transport', margin + 5, currentY + 5);
  safeText(`${data.selling_price || '-'} € HT`, margin + 5, currentY + 8);
  safeText('*taxe gasoil inclus*', margin + 5, currentY + 11, { fontSize: 6 });

  // Right payment section
  safeText('Mode de règlement', rightBox + 5, currentY + 5);
  safeText(data.payment_method || '-', rightBox + 5, currentY + 8);
  currentY += priceBlockHeight + 5;

  // Photo requirement - modified with rounded border
  const photoText = 'PRISE DE PHOTO IMPÉRATIVE AU CHARGEMENT ET DÉCHARGEMENT';
  const photoTextWidth = doc.getTextWidth(photoText);
  const photoBoxWidth = photoTextWidth + 10;
  const photoBoxX = (pageWidth - photoBoxWidth) / 2;
  
  doc.setDrawColor('#000000');
  doc.setLineWidth(0.5);
  doc.roundedRect(photoBoxX, currentY, photoBoxWidth, 10, 3, 3, 'S');
  drawText(photoText, pageWidth / 2, currentY + 7, {
    color: 'red',
    align: 'center',
    style: 'bold'
  });
  doc.setTextColor(0, 0, 0); // Reset text color to black

  currentY += 25;  // Increased spacing after photo block
  currentY += 15;  // Additional spacing before legal mentions

  // Check if we need a new page for legal mentions
  if (needsNewPage(currentY, 20, pageHeight, margin)) {
    doc.addPage();
    currentY = margin;
  }
  currentY += 10;  // Added spacing before legal text

  // Legal text - adjusted spacing and justification
  doc.setFontSize(8);
  currentY += 5;  // Added spacing before facturation
  doc.text('FACTURATION: direction@mzntransport.fr', margin, currentY);
  currentY += 5;  // Spacing after facturation line
  doc.text('Merci de rappeler le numéro d\'affrètement impérativement sur vos factures + CMR', 
    margin, currentY, { align: 'justify', maxWidth: pageWidth - 2 * margin });
  currentY += 10;  // Increased spacing before legal text

  if (needsNewPage(currentY, 70, pageHeight, margin)) {
    doc.addPage();
    currentY = margin;
  }

  currentY += 5;  // Added spacing before legal text
  const legalText = `En cas de problème ou retard survenant lors du transport ou des opérations de chargement et déchargement, nous contacter impérativement afin d'en informer nos clients dans les meilleurs délais. - Les documents de transport émargés doivent impérativement nous parvenir avec la facture.
- Les instructions de ce fax doivent être suivies dans le strict respect de la règlementation sociale (Temps de conduite et de repos et respecter la limitation de vitesse).
- Le transporteur reconnaît le prix déterminé par les parties dans ce contrat ne relève pas que définition de l'article 3 de la loi 92-1445 du 31 décembre 1992. - L'entreprise certifie avoir souscrit une assurance tant en responsabilité civile et professionnelle que contractuelle, et être inscrit au registre des transporteurs.`;

  doc.text(legalText, margin, currentY, {
    maxWidth: pageWidth - 2 * margin,
    align: 'justify'
  });
  currentY += 5;  // Added spacing after legal text

  // Contact info - adjusted spacing
  if (needsNewPage(currentY, 40, pageHeight, margin)) {
    doc.addPage();
    currentY = margin;
  }

  currentY += 5;  // Added spacing before contacts
  safeText('NOS CONTACTS', margin, currentY, { fontSize: 9, style: 'bold' });
  currentY += 6;
  safeText('Eliot : 07 81 30 59 87 Commerce / exploitation : exploitation@mzntransport.fr', margin, currentY);
  currentY += 6;
  safeText('Orlane : 07 81 65 49 21 Assistance direction : contact@mzntransport.fr', margin, currentY);
  currentY += 6;
  safeText('Salomé : 06 89 28 43 07 Direction / Comptabilité : direction@mzntransport.fr', margin, currentY);
  currentY += 10;  // Increased spacing before approval

  // Approval section
  if (!needsNewPage(currentY, 30, pageHeight, margin)) {
    safeText('BON POUR ACCORD', pageWidth / 2 - 30, currentY + 10, {
      fontSize: 12,
      style: 'bold'
    });
    safeText('Date et cachet commercial', pageWidth / 2 + 30, currentY + 10, {
      fontSize: 8
    });
    // Add line for signature
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 30, currentY + 25, pageWidth / 2 + 30, currentY + 25);
  }

  // Generate a blob URL for the PDF
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  // Also save the PDF
  const nomClient = data.clients?.nom || 'Client';
  const numAffretement = data.number || '0000';
  doc.save(`Affretement_${nomClient}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

  return url;
}