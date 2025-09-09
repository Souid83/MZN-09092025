/*
  # Add Insert Policy for Clients Table

  1. Security Changes
    - Add policy to allow authenticated users to create new clients
    - This policy allows any authenticated user to create clients
    - The policy ensures basic data integrity by requiring the nom (name) field
*/

CREATE POLICY "Enable insert access for authenticated users" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Ensure the name field is not empty
    length(nom) > 0
  );