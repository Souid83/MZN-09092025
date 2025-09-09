/*
  # Add tva_rate column to fournisseurs table

  1. Changes
    - Add tva_rate numeric column to fournisseurs table
    - Set default value to 20.0
    - This will store the VAT rate to apply for invoices
*/

-- Add tva_rate column to fournisseurs
ALTER TABLE fournisseurs 
ADD COLUMN IF NOT EXISTS tva_rate numeric DEFAULT 20.0;