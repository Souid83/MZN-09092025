-- Add status column to freight_slips
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'waiting'::text;

-- Add check constraint to ensure valid status values
ALTER TABLE freight_slips
ADD CONSTRAINT freight_slips_status_check 
CHECK (status = ANY (ARRAY['waiting'::text, 'loaded'::text, 'delivered'::text, 'dispute'::text]));

-- Add vehicule_id to transport_slips
ALTER TABLE transport_slips 
ADD COLUMN IF NOT EXISTS vehicule_id uuid REFERENCES vehicules(id);

-- Update the select query in getAllTransportSlips to remove vehicules join
DO $$ 
BEGIN
  -- Remove the vehicules join from the query since we now have a proper foreign key
  -- This is handled in the TypeScript code
  NULL;
END $$;