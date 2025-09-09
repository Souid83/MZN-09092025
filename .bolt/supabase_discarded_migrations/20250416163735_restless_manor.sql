/*
  # Set up Database Relationships
  
  1. Changes
    - Create users table if not exists
    - Add missing columns and constraints to freight_slips
    - Add missing columns and constraints to transport_slips
    - Add proper foreign key relationships
    - Add indexes for performance

  2. Tables Modified
    - users (created if not exists)
    - freight_slips
    - transport_slips
    - clients
    - fournisseurs
*/

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure freight_slips has all required columns
ALTER TABLE freight_slips
ADD COLUMN IF NOT EXISTS client_id uuid,
ADD COLUMN IF NOT EXISTS fournisseur_id uuid,
ADD COLUMN IF NOT EXISTS commercial_id uuid;

-- Ensure transport_slips has all required columns
ALTER TABLE transport_slips
ADD COLUMN IF NOT EXISTS client_id uuid,
ADD COLUMN IF NOT EXISTS vehicule_id uuid;

-- Add foreign key constraints
ALTER TABLE freight_slips
DROP CONSTRAINT IF EXISTS freight_slips_client_id_fkey,
DROP CONSTRAINT IF EXISTS freight_slips_fournisseur_id_fkey,
DROP CONSTRAINT IF EXISTS freight_slips_commercial_id_fkey,
ADD CONSTRAINT freight_slips_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
ADD CONSTRAINT freight_slips_fournisseur_id_fkey 
  FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE SET NULL,
ADD CONSTRAINT freight_slips_commercial_id_fkey 
  FOREIGN KEY (commercial_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE transport_slips
DROP CONSTRAINT IF EXISTS transport_slips_client_id_fkey,
ADD CONSTRAINT transport_slips_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_freight_slips_client_id ON freight_slips(client_id);
CREATE INDEX IF NOT EXISTS idx_freight_slips_fournisseur_id ON freight_slips(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_freight_slips_commercial_id ON freight_slips(commercial_id);
CREATE INDEX IF NOT EXISTS idx_transport_slips_client_id ON transport_slips(client_id);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add read policy for users table
CREATE POLICY "Allow authenticated users to read users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Create updated_at trigger for users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();