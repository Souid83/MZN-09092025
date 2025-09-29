/*
  # Add Update Policies for Clients and Fournisseurs Tables

  1. Security Changes
    - Add policies to allow authenticated users to update clients and fournisseurs
    - These policies allow any authenticated user to update existing records
    - Basic data integrity checks are included
*/

-- Add update policy for clients
CREATE POLICY "Enable update access for authenticated users" ON clients
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    length(nom) > 0
  );

-- Add update policy for fournisseurs
CREATE POLICY "Enable update access for authenticated users" ON fournisseurs
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    length(nom) > 0
  );