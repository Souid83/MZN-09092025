/*
  # Add status column to transport_slips

  1. Changes
    - Add status column to transport_slips table
    - Add check constraint for valid status values
    - Set default status value to 'waiting'
*/

-- Add status column to transport_slips
ALTER TABLE transport_slips 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'waiting'::text;

-- Add check constraint to ensure valid status values
ALTER TABLE transport_slips
ADD CONSTRAINT transport_slips_status_check 
CHECK (status = ANY (ARRAY['waiting'::text, 'loaded'::text, 'delivered'::text, 'dispute'::text]));