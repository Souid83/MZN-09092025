/*
  # Create missing tables and relationships

  1. New Tables
    - `client_contacts`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `name` (text)
      - `email` (text)
      - `phone` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `client_accounting_contacts`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `name` (text)
      - `email` (text)
      - `phone` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `fournisseurs`
      - `id` (uuid, primary key)
      - `nom` (text)
      - `email` (text)
      - `telephone` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

-- Create client_contacts table
CREATE TABLE IF NOT EXISTS client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read client contacts"
  ON client_contacts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert client contacts"
  ON client_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update client contacts"
  ON client_contacts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create client_accounting_contacts table
CREATE TABLE IF NOT EXISTS client_accounting_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_accounting_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read accounting contacts"
  ON client_accounting_contacts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert accounting contacts"
  ON client_accounting_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update accounting contacts"
  ON client_accounting_contacts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create fournisseurs table
CREATE TABLE IF NOT EXISTS fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  email text,
  telephone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read fournisseurs"
  ON fournisseurs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert fournisseurs"
  ON fournisseurs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update fournisseurs"
  ON fournisseurs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_accounting_contacts_updated_at
  BEFORE UPDATE ON client_accounting_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fournisseurs_updated_at
  BEFORE UPDATE ON fournisseurs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();