/*
  # Add kilometers field to transport_slips table

  1. Changes
    - Add kilometers numeric column to transport_slips table
    - Add price_per_km numeric column as a generated column
    - This allows tracking distance and automatically calculating price per kilometer
*/

-- Add kilometers column to transport_slips if it doesn't exist
ALTER TABLE transport_slips 
ADD COLUMN IF NOT EXISTS kilometers numeric;

-- Add price_per_km as a generated column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transport_slips' 
    AND column_name = 'price_per_km'
  ) THEN
    ALTER TABLE transport_slips 
    ADD COLUMN price_per_km numeric GENERATED ALWAYS AS (price / NULLIF(kilometers, 0)) STORED;
  END IF;
END $$;