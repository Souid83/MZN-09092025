/*
  # Create Client Quotes Table

  1. New Table
    - `client_quotes`
      - `id` (uuid, primary key)
      - `numero` (text, unique)
      - `client_id` (uuid, foreign key)
      - `description` (text)
      - `date_emission` (date)
      - `montant_ht` (numeric)
      - `tva` (numeric)
      - `montant_ttc` (numeric)
      - `lien_pdf` (text)
      - `statut` (text)
      - `invoice_id` (uuid, foreign key, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on client_quotes table
    - Add policies for authenticated users
*/

-- Create client_quotes table
CREATE TABLE IF NOT EXISTS client_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE RESTRICT,
  description text NOT NULL,
  date_emission date NOT NULL DEFAULT CURRENT_DATE,
  montant_ht numeric NOT NULL,
  tva numeric NOT NULL,
  montant_ttc numeric NOT NULL,
  lien_pdf text,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'accepte', 'refuse', 'facture')),
  invoice_id uuid REFERENCES client_invoices(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_quotes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON client_quotes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON client_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON client_quotes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_client_quotes_updated_at
  BEFORE UPDATE ON client_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();