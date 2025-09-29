/*
  # Update commercial_id to text type

  1. Changes
    - Change commercial_id column type from UUID to text in freight_slips table
    - This allows storing the commercial name directly instead of a reference
*/

-- Change commercial_id column type
ALTER TABLE freight_slips 
  ALTER COLUMN commercial_id TYPE text;