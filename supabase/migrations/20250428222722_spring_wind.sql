/*
  # Add observations column to freight_slips table

  1. Changes
    - Add `observations` column to `freight_slips` table
      - Type: text
      - Nullable: true
      - No default value

  2. Notes
    - This column is used to store additional notes or observations about freight slips
    - The column is made nullable to maintain compatibility with existing records
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freight_slips' 
    AND column_name = 'observations'
  ) THEN
    ALTER TABLE freight_slips ADD COLUMN observations text;
  END IF;
END $$;