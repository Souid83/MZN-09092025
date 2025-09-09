/*
  # Create Invoice Slip References Table

  1. New Table
    - `invoice_slip_references`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, foreign key to client_invoices)
      - `slip_id` (uuid)
      - `slip_type` (text)
      - `created_at` (timestamp)

  2. Changes to client_invoices
    - Make bordereau_id nullable
    - Add metadata column for additional information

  3. Security
    - Enable RLS on invoice_slip_references table
    - Add policies for authenticated users
*/

-- Make bordereau_id nullable in client_invoices
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_invoices' 
    AND column_name = 'bordereau_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE client_invoices 
    ALTER COLUMN bordereau_id DROP NOT NULL;
  END IF;
END $$;

-- Add metadata column to client_invoices
ALTER TABLE client_invoices
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create invoice_slip_references table
CREATE TABLE IF NOT EXISTS invoice_slip_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES client_invoices(id) ON DELETE CASCADE,
  slip_id uuid NOT NULL,
  slip_type text NOT NULL CHECK (slip_type IN ('transport', 'freight')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoice_slip_references ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON invoice_slip_references
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON invoice_slip_references
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_slip_references_slip
  ON invoice_slip_references (slip_id, slip_type);

CREATE INDEX IF NOT EXISTS idx_invoice_slip_references_invoice
  ON invoice_slip_references (invoice_id);