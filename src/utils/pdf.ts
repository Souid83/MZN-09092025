import { jsPDF } from 'jspdf';
import 'jspdf-html2canvas';

/**
 * Generates a PDF from HTML content with placeholder replacements
 * @param htmlContent The HTML template with {{placeholder}} tags
 * @param data Object containing values to replace placeholders
 * @returns Promise<Blob> The generated PDF as a Blob
 */
export async function generatePdfFromHtml(
  htmlContent: string,
  data: Record<string, string>
): Promise<Blob> {
  // Replace all placeholders with actual data
  let processedHtml = htmlContent;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    processedHtml = processedHtml.replace(placeholder, value || '');
  });

  // Create a temporary container
  const container = document.createElement('div');
  container.innerHTML = processedHtml;
  container.style.width = '210mm'; // A4 width
  document.body.appendChild(container);

  // Initialize jsPDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  try {
    // Convert to PDF using html() method
    await doc.html(container, {
      callback: function(doc) {
        // Add margins
        const margin = 10; // 10mm margins
        doc.setProperties({
          title: 'Document',
          subject: 'Generated PDF',
          author: 'MZN Transport',
          keywords: 'transport, document',
          creator: 'MZN Transport System'
        });
        
        // Adjust content position
        doc.internal.write(
          0, // x
          margin, // y
          doc.internal.pageSize.getWidth() - (margin * 2), // width
          doc.internal.pageSize.getHeight() - (margin * 2) // height
        );
      },
      width: doc.internal.pageSize.getWidth() - 20, // Account for margins
      windowWidth: 794 // A4 width in pixels at 96 DPI
    });

    // Clean up
    document.body.removeChild(container);

    // Return as blob
    return doc.output('blob');
  } catch (error) {
    // Clean up on error
    document.body.removeChild(container);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}