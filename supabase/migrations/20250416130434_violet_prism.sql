/*
  # Add Commercial Field to Freight Slips

  1. Changes
    - Add commercial column to freight_slips table
    - This field will store the name of the commercial agent handling the freight
*/

-- Add commercial column to freight_slips
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS commercial text;