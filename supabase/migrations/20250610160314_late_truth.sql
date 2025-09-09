/*
  # Create Client Invoices Table

  1. New Tables
    - `client_invoices`
      - `id` (uuid, primary key)
      - `numero` (text, unique)
      - `client_id` (uuid, foreign key)
      - `bordereau_id` (uuid)
      - `bordereau_type` (text)
      - `type` (text, default 'facture')
      - `date_emission` (date)
      - `montant_ht` (numeric)
      - `tva` (numeric)
      - `montant_ttc` (numeric)
      - `lien_pdf` (text)
      - `lien_cmr` (text)
      - `statut` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on client_invoices table
    - Add policies for authenticated users
*/

-- Create client_invoices table
CREATE TABLE IF NOT EXISTS client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE RESTRICT,
  bordereau_id uuid NOT NULL,
  bordereau_type text NOT NULL CHECK (bordereau_type IN ('transport', 'freight')),
  type text NOT NULL DEFAULT 'facture',
  date_emission date NOT NULL DEFAULT CURRENT_DATE,
  montant_ht numeric NOT NULL,
  tva numeric NOT NULL,
  montant_ttc numeric NOT NULL,
  lien_pdf text,
  lien_cmr text,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'paye')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON client_invoices
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON client_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON client_invoices
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_client_invoices_updated_at
  BEFORE UPDATE ON client_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();