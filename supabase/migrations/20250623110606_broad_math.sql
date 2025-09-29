/*
  # Create Credit Notes Table

  1. New Table
    - `credit_notes`
      - `id` (uuid, primary key)
      - `numero` (text, unique)
      - `invoice_id` (uuid, foreign key to client_invoices)
      - `client_id` (uuid, foreign key to clients)
      - `date_emission` (date)
      - `montant_ht` (numeric)
      - `tva` (numeric)
      - `montant_ttc` (numeric)
      - `motif` (text)
      - `lien_pdf` (text)
      - `statut` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on credit_notes table
    - Add policies for authenticated users
*/

-- Create credit_notes table
CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  invoice_id uuid REFERENCES client_invoices(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES clients(id) ON DELETE RESTRICT,
  date_emission date NOT NULL DEFAULT CURRENT_DATE,
  montant_ht numeric NOT NULL,
  tva numeric NOT NULL,
  montant_ttc numeric NOT NULL,
  motif text NOT NULL,
  lien_pdf text,
  statut text NOT NULL DEFAULT 'emis' CHECK (statut IN ('emis', 'comptabilise')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON credit_notes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON credit_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON credit_notes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_credit_notes_updated_at
  BEFORE UPDATE ON credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();