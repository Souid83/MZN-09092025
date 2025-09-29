/*
  # Update credit_notes table to allow null invoice_id

  1. Changes
    - Make invoice_id nullable in credit_notes table
    - This allows creating credit notes without linking to a specific invoice
*/

-- Make invoice_id nullable in credit_notes
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_notes' 
    AND column_name = 'invoice_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE credit_notes 
    ALTER COLUMN invoice_id DROP NOT NULL;
  END IF;
END $$;