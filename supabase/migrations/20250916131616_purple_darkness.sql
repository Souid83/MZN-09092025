/*
  # Add created_by column to fournisseurs table

  1. Schema Changes
    - Add `created_by` column to `fournisseurs` table
    - Set up foreign key relationship with auth.users
    - Add trigger to automatically set created_by on insert

  2. Security
    - Maintain existing RLS policies
    - Ensure created_by is automatically populated

  This migration adds the missing created_by column that the application expects for user-specific filtering.
*/

-- Add created_by column to fournisseurs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fournisseurs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE fournisseurs ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create trigger function to set created_by automatically
CREATE OR REPLACE FUNCTION set_fournisseurs_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set created_by on insert
DROP TRIGGER IF EXISTS set_fournisseurs_created_by ON fournisseurs;
CREATE TRIGGER set_fournisseurs_created_by
  BEFORE INSERT ON fournisseurs
  FOR EACH ROW
  EXECUTE FUNCTION set_fournisseurs_created_by();