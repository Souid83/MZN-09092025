/*
  # Update commercial_id to text type

  1. Changes
    - Drop existing foreign key constraint
    - Change commercial_id column type to text
    - Remove reference to users table since we're storing names directly

  2. Notes
    - This change allows storing commercial names directly
    - No more UUID dependency
*/

-- Drop the foreign key constraint if it exists
ALTER TABLE freight_slips 
  DROP CONSTRAINT IF EXISTS freight_slips_commercial_id_fkey;

-- Change commercial_id column type
ALTER TABLE freight_slips 
  ALTER COLUMN commercial_id TYPE text USING commercial_id::text;