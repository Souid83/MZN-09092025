/*
  # Remove default value for instructions field

  1. Changes
    - Remove default value 'BIEN ARRIMER LA MARCHANDISE' from instructions column in both tables
*/

-- Remove default value from transport_slips
ALTER TABLE transport_slips 
ALTER COLUMN instructions DROP DEFAULT;

-- Remove default value from freight_slips
ALTER TABLE freight_slips 
ALTER COLUMN instructions DROP DEFAULT;