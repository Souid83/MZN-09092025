/*
  # Add Status and Vehicle Columns

  1. Changes
    - Add status column to freight_slips if not exists
    - Add vehicule_id to transport_slips if not exists
    - Add check constraints for status values if not exists

  2. Notes
    - Uses DO blocks to conditionally add constraints
    - Handles cases where constraints already exist
*/

-- Add status column to freight_slips if not exists
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'waiting'::text;

-- Add check constraint for freight_slips status if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'freight_slips_status_check'
  ) THEN
    ALTER TABLE freight_slips
    ADD CONSTRAINT freight_slips_status_check 
    CHECK (status = ANY (ARRAY['waiting'::text, 'loaded'::text, 'delivered'::text, 'dispute'::text]));
  END IF;
END $$;

-- Add vehicule_id to transport_slips if not exists
ALTER TABLE transport_slips 
ADD COLUMN IF NOT EXISTS vehicule_id uuid REFERENCES vehicules(id);