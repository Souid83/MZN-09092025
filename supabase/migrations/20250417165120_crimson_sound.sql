/*
  # Remove price/km column from transport_slips table

  1. Changes
    - Remove prix_km column as it's no longer needed
*/

ALTER TABLE transport_slips 
DROP COLUMN IF EXISTS prix_km;