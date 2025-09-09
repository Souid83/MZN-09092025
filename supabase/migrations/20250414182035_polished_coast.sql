/*
  # Add documents column to transport and freight slips

  1. Changes
    - Add documents JSONB column to transport_slips table
    - Add documents JSONB column to freight_slips table
    - Set default value to empty JSON object
    - This will store document references uploaded by users
*/

-- Add documents column to transport_slips
ALTER TABLE transport_slips
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}'::jsonb;

-- Add documents column to freight_slips
ALTER TABLE freight_slips
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}'::jsonb;