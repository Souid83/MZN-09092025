/*
  # Add Missing Relationships and Columns

  1. Changes
    - Add missing foreign key relationships for freight_slips
    - Add accounting_contact relationship for clients
    - Add missing columns if they don't exist
    - No RLS changes as specified

  2. Relationships Added
    - freight_slips.client_id → clients.id
    - freight_slips.commercial_id → users.id  
    - freight_slips.fournisseur_id → fournisseurs.id
    - clients.accounting_contact_id → contacts.id
*/

-- Add accounting_contact_id to clients if it doesn't exist
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS accounting_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;

-- Add missing columns to freight_slips if they don't exist
DO $$ 
BEGIN
  -- Add client_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freight_slips' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE freight_slips ADD COLUMN client_id uuid;
  END IF;

  -- Add commercial_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freight_slips' AND column_name = 'commercial_id'
  ) THEN
    ALTER TABLE freight_slips ADD COLUMN commercial_id uuid;
  END IF;

  -- Add fournisseur_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freight_slips' AND column_name = 'fournisseur_id'
  ) THEN
    ALTER TABLE freight_slips ADD COLUMN fournisseur_id uuid;
  END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  -- freight_slips.client_id → clients.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'freight_slips_client_id_fkey'
  ) THEN
    ALTER TABLE freight_slips 
    ADD CONSTRAINT freight_slips_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
  END IF;

  -- freight_slips.commercial_id → users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'freight_slips_commercial_id_fkey'
  ) THEN
    ALTER TABLE freight_slips 
    ADD CONSTRAINT freight_slips_commercial_id_fkey 
    FOREIGN KEY (commercial_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- freight_slips.fournisseur_id → fournisseurs.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'freight_slips_fournisseur_id_fkey'
  ) THEN
    ALTER TABLE freight_slips 
    ADD CONSTRAINT freight_slips_fournisseur_id_fkey 
    FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_freight_slips_client_id ON freight_slips(client_id);
CREATE INDEX IF NOT EXISTS idx_freight_slips_commercial_id ON freight_slips(commercial_id);
CREATE INDEX IF NOT EXISTS idx_freight_slips_fournisseur_id ON freight_slips(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_clients_accounting_contact_id ON clients(accounting_contact_id);