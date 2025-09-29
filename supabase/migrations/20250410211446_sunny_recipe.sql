/*
  # Add SIRET and VAT number fields

  1. Changes
    - Add SIRET and VAT number fields to clients and fournisseurs tables
    - Add additional emails array field
*/

-- Add SIRET and VAT number to clients
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS numero_tva text,
  ADD COLUMN IF NOT EXISTS emails text[] DEFAULT '{}';

-- Add SIRET and VAT number to fournisseurs
ALTER TABLE fournisseurs 
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS numero_tva text,
  ADD COLUMN IF NOT EXISTS emails text[] DEFAULT '{}';