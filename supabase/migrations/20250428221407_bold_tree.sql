/*
  # Remove observations column from transport and freight slips

  1. Changes
    - Remove observations column from transport_slips table
    - Remove observations column from freight_slips table
*/

-- Remove observations column from transport_slips
ALTER TABLE transport_slips 
DROP COLUMN IF EXISTS observations;

-- Remove observations column from freight_slips
ALTER TABLE freight_slips 
DROP COLUMN IF EXISTS observations;