/*
  # Add Status Column to Transport Slips

  1. Changes
    - Add status column to transport_slips if not exists
    - Add check constraint for valid status values if not exists
    - Uses DO block to safely add constraint

  2. Notes
    - Handles case where constraint already exists
    - Maintains data integrity with same status values
*/

-- Add status column if not exists
ALTER TABLE transport_slips 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'waiting'::text;

-- Add check constraint if not exists using DO block
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'transport_slips_status_check'
  ) THEN
    ALTER TABLE transport_slips
    ADD CONSTRAINT transport_slips_status_check 
    CHECK (status = ANY (ARRAY['waiting'::text, 'loaded'::text, 'delivered'::text, 'dispute'::text]));
  END IF;
END $$;