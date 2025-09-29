import { read, utils } from 'xlsx';
import { supabase } from '../lib/supabase';
import type { CreateClientPayload, CreateFournisseurPayload, WeekSchedule } from '../types';

// Helper function to detect and remove UTF-8 BOM
function removeBOM(text: string): string {
  // UTF-8 BOM is EF BB BF (239 187 191)
  if (text.charCodeAt(0) === 0xFEFF) {
    return text.slice(1);
  }
  return text;
}

// Helper function to ensure proper UTF-8 encoding
function ensureUTF8(text: string): string {
  if (!text) return text;
  
  try {
    // Remove BOM if present
    text = removeBOM(text);
    
    // Normalize Unicode characters to ensure proper display
    return text.normalize('NFC');
  } catch (error) {
    console.warn('Error normalizing text:', error);
    return text;
  }
}

// Helper function to clean object values recursively
function cleanObjectValues(obj: any): any {
  if (typeof obj === 'string') {
    return ensureUTF8(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanObjectValues);
  }
  
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanObjectValues(value);
    }
    return cleaned;
  }
  
  return obj;
}

const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { start: '09:00', end: '19:00', closed: false },
  tuesday: { start: '09:00', end: '19:00', closed: false },
  wednesday: { start: '09:00', end: '19:00', closed: false },
  thursday: { start: '09:00', end: '19:00', closed: false },
  friday: { start: '09:00', end: '19:00', closed: false },
  saturday: { start: '09:00', end: '19:00', closed: true },
  sunday: { start: '09:00', end: '19:00', closed: true },
};

async function getCountryIdByName(countryName: string): Promise<string | undefined> {
  if (!countryName) return undefined;

  const { data, error } = await supabase
    .from('countries')
    .select('id')
    .ilike('name', countryName)
    .limit(1);

  if (error) {
    console.error('Error fetching country:', error);
    return undefined;
  }

  return data && data.length > 0 ? data[0].id : undefined;
}

function getSkipRowsCount(file: File): number {
  // For CSV files, skip 2 rows (2 comment lines)
  // For XLSX files, skip 1 row (1 legend line)
  const fileExtension = file.name.toLowerCase().split('.').pop();
  return fileExtension === 'csv' ? 2 : 1;
}

export async function parseClientsExcel(file: File): Promise<CreateClientPayload[]> {
  const buffer = await file.arrayBuffer();
  
  if (buffer.byteLength === 0) {
    throw new Error('Le fichier est vide');
  }
  
  let workbook;
  try {
    // For CSV files, ensure UTF-8 encoding
    if (file.name.toLowerCase().endsWith('.csv')) {
      // Read as text with UTF-8 encoding
      const decoder = new TextDecoder('utf-8');
      const csvText = decoder.decode(buffer);
      const cleanedText = ensureUTF8(csvText);
      
      // Convert back to workbook format
      workbook = read(cleanedText, { type: 'string', codepage: 65001 }); // 65001 = UTF-8
    } else {
      // For Excel files, use default reading with UTF-8 support
      workbook = read(buffer, { codepage: 65001 });
    }
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error('Format de fichier invalide ou corrompu');
  }
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Le fichier ne contient aucune feuille de calcul');
  }
  
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  if (!worksheet) {
    throw new Error('Feuille de calcul vide ou invalide');
  }
  
  // Get the range of the worksheet
  const range = utils.decode_range(worksheet['!ref'] || 'A1:A1');
  
  // Dynamically determine how many rows to skip based on file type
  const skipRows = getSkipRowsCount(file);
  
  // Get headers from the first data row (after skipping comment rows)
  const headerRow = skipRows;
  const headers: string[] = [];
  
  // Extract headers
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = utils.encode_cell({ r: headerRow, c: col });
    const cell = worksheet[cellAddress];
    if (cell) {
      // Use formatted text if available, otherwise convert value to string
      const headerValue = cell.w || (cell.v ? String(cell.v) : '');
      headers.push(ensureUTF8(headerValue));
    } else {
      headers.push('');
    }
  }
  
  if (headers.length === 0) {
    throw new Error('Aucune donnée trouvée dans le fichier ou format incorrect');
  }

  // Fields that should preserve leading zeros
  const textFields = ['telephone', 'siret', 'numero_tva', 'comptable_telephone', 'code_postal'];
  
  // Process data rows
  const processedData: any[] = [];
  
  for (let row = headerRow + 1; row <= range.e.r; row++) {
    const rowData: any = {};
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      const header = headers[col - range.s.c];
      
      if (cell) {
        let value: string;
        
        // For fields that should preserve leading zeros, prioritize formatted text
        if (textFields.includes(header)) {
          // Use formatted text (w) if available, otherwise convert value to string
          value = cell.w || (cell.v !== undefined ? String(cell.v) : '');
        } else {
          // For other fields, use the raw value converted to string
          value = cell.v !== undefined ? String(cell.v) : '';
        }
        
        rowData[ensureUTF8(header)] = ensureUTF8(value);
      } else {
        rowData[ensureUTF8(header)] = '';
      }
    }
    
    processedData.push(rowData);
  }

  // Validate required columns
  if (!headers.includes('nom')) {
    throw new Error('Colonne obligatoire manquante: "nom"');
  }

  const clients: CreateClientPayload[] = [];
  const errors: { row: number; errors: string[] }[] = [];

  for (let i = 0; i < processedData.length; i++) {
    const row = processedData[i] as any;
    
    // Skip empty rows (check if nom is empty or only whitespace)
    if (!row.nom || typeof row.nom !== 'string' || row.nom.trim() === '') {
      continue;
    }
    
    const rowErrors: string[] = [];

    // Required fields validation
    if (!row.nom) rowErrors.push('Le nom est requis');
    if (!row.preference_facturation) rowErrors.push('La préférence de facturation est requise');

    // Validate preference_facturation
    if (row.preference_facturation && !['mensuelle', 'hebdomadaire', 'par_transport'].includes(row.preference_facturation)) {
      rowErrors.push('La préférence de facturation doit être: mensuelle, hebdomadaire, ou par_transport');
    }

    // Parse opening hours from individual fields
    let opening_hours: WeekSchedule = { ...DEFAULT_SCHEDULE };
    
    // Days of the week in English
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    // Days of the week in French for the column names
    const daysFr = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    
    for (let j = 0; j < days.length; j++) {
      const day = days[j];
      const dayFr = daysFr[j];
      
      const startField = `horaires_${dayFr}_de`;
      const endField = `horaires_${dayFr}_a`;
      const closedField = `${dayFr}_ferme`;
      
      if (row[startField] && row[endField]) {
        opening_hours[day as keyof WeekSchedule] = {
          start: row[startField],
          end: row[endField],
          closed: row[closedField] === 'true' || row[closedField] === true
        };
      }
    }

    // Create accounting contact
    const accounting_contact = {
      nom: row.comptable_nom || '',
      prenom: row.comptable_prenom || '',
      email: row.comptable_email || '',
      telephone: row.comptable_telephone || ''
    };

    // Get country ID
    const country_id = await getCountryIdByName(row.pays);

    if (rowErrors.length > 0) {
      errors.push({ row: i + skipRows + 3, errors: rowErrors }); // +3 for 1-indexed rows, header row, and skipped rows
      continue;
    }

    // Build full address from components
    const adresse_facturation = row.adresse && row.code_postal && row.ville
      ? `${row.adresse}, ${row.code_postal} ${row.ville}`
      : row.adresse_facturation || '';

    clients.push({
      nom: ensureUTF8(row.nom),
      email: ensureUTF8(row.email),
      emails: row.emails ? row.emails.split(',').map((email: string) => ensureUTF8(email.trim())) : [],
      telephone: ensureUTF8(row.telephone),
      adresse_facturation,
      preference_facturation: ensureUTF8(row.preference_facturation),
      tva_rate: row.tva_rate ? Number(row.tva_rate) : undefined,
      numero_commande_requis: row.numero_commande_requis === 'true' || row.numero_commande_requis === true,
      siret: ensureUTF8(row.siret),
      numero_tva: ensureUTF8(row.numero_tva),
      country_id,
      contacts: [], // No contacts in the simplified format
      accounting_contact: accounting_contact.nom ? cleanObjectValues(accounting_contact) : undefined,
      opening_hours
    });
  }

  if (errors.length > 0) {
    throw new Error('Validation errors:\n' + errors.map(e => 
      `Row ${e.row}: ${e.errors.join(', ')}`
    ).join('\n'));
  }

  return clients;
}

export async function parseFournisseursExcel(file: File): Promise<CreateFournisseurPayload[]> {
  const buffer = await file.arrayBuffer();
  
  if (buffer.byteLength === 0) {
    throw new Error('Le fichier est vide');
  }
  
  let workbook;
  try {
    // For CSV files, ensure UTF-8 encoding
    if (file.name.toLowerCase().endsWith('.csv')) {
      // Read as text with UTF-8 encoding
      const decoder = new TextDecoder('utf-8');
      const csvText = decoder.decode(buffer);
      const cleanedText = ensureUTF8(csvText);
      
      // Convert back to workbook format
      workbook = read(cleanedText, { type: 'string', codepage: 65001 }); // 65001 = UTF-8
    } else {
      // For Excel files, use default reading with UTF-8 support
      workbook = read(buffer, { codepage: 65001 });
    }
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error('Format de fichier invalide ou corrompu');
  }
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Le fichier ne contient aucune feuille de calcul');
  }
  
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  if (!worksheet) {
    throw new Error('Feuille de calcul vide ou invalide');
  }
  
  // Get the range of the worksheet
  const range = utils.decode_range(worksheet['!ref'] || 'A1:A1');
  
  // Dynamically determine how many rows to skip based on file type
  const skipRows = getSkipRowsCount(file);
  
  // Get headers from the first data row (after skipping comment rows)
  const headerRow = skipRows;
  const headers: string[] = [];
  
  // Extract headers
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = utils.encode_cell({ r: headerRow, c: col });
    const cell = worksheet[cellAddress];
    if (cell) {
      // Use formatted text if available, otherwise convert value to string
      const headerValue = cell.w || (cell.v ? String(cell.v) : '');
      headers.push(ensureUTF8(headerValue));
    } else {
      headers.push('');
    }
  }
  
  if (headers.length === 0) {
    throw new Error('Aucune donnée trouvée dans le fichier ou format incorrect');
  }

  // Fields that should preserve leading zeros
  const textFields = ['telephone', 'siret', 'numero_tva', 'comptable_telephone'];
  
  // Process data rows
  const processedData: any[] = [];
  
  for (let row = headerRow + 1; row <= range.e.r; row++) {
    const rowData: any = {};
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      const header = headers[col - range.s.c];
      
      if (cell) {
        let value: string;
        
        // For fields that should preserve leading zeros, prioritize formatted text
        if (textFields.includes(header)) {
          // Use formatted text (w) if available, otherwise convert value to string
          value = cell.w || (cell.v !== undefined ? String(cell.v) : '');
        } else {
          // For other fields, use the raw value converted to string
          value = cell.v !== undefined ? String(cell.v) : '';
        }
        
        rowData[ensureUTF8(header)] = ensureUTF8(value);
      } else {
        rowData[ensureUTF8(header)] = '';
      }
    }
    
    processedData.push(rowData);
  }

  // Validate required columns
  if (!headers.includes('nom')) {
    throw new Error('Colonne obligatoire manquante: "nom"');
  }

  const fournisseurs: CreateFournisseurPayload[] = [];
  const errors: { row: number; errors: string[] }[] = [];

  for (let i = 0; i < processedData.length; i++) {
    const row = processedData[i] as any;
    
    // Skip empty rows (check if nom is empty or only whitespace)
    if (!row.nom || typeof row.nom !== 'string' || row.nom.trim() === '') {
      continue;
    }
    
    const rowErrors: string[] = [];

    // Required fields validation
    if (!row.nom) rowErrors.push('Le nom est requis');

    // Parse arrays
    const services_offerts = row.services_offerts ? row.services_offerts.split(';').map((s: string) => s.trim()) : [];
    const zones_couvertes = row.zones_couvertes ? row.zones_couvertes.split(';').map((z: string) => z.trim()) : [];
    const emails = row.emails ? row.emails.split(',').map((email: string) => email.trim()) : [];

    // Get country ID
    const country_id = await getCountryIdByName(row.pays);

    if (rowErrors.length > 0) {
      errors.push({ row: i + skipRows + 2, errors: rowErrors }); // +2 for 1-indexed rows and skipped rows
      continue;
    }

    fournisseurs.push({
      nom: ensureUTF8(row.nom),
      contact_nom: ensureUTF8(row.contact_nom),
      email: ensureUTF8(row.email),
      emails: emails.map(email => ensureUTF8(email)),
      telephone: ensureUTF8(row.telephone),
      services_offerts: services_offerts.map(service => ensureUTF8(service)),
      zones_couvertes: zones_couvertes.map(zone => ensureUTF8(zone)),
      conditions_paiement: ensureUTF8(row.conditions_paiement),
      siret: ensureUTF8(row.siret),
      numero_tva: ensureUTF8(row.numero_tva),
      country_id,
      tva_rate: row.tva_rate ? Number(row.tva_rate) : 20
    });
  }

  if (errors.length > 0) {
    throw new Error('Validation errors:\n' + errors.map(e => 
      `Row ${e.row}: ${e.errors.join(', ')}`
    ).join('\n'));
  }

  return fournisseurs;
}