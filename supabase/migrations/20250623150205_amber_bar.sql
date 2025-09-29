/*
  # Add Role-Based Access Restrictions for Exploit Users

  1. New Columns
    - Add `created_by` column to transport_slips, freight_slips, client_quotes, client_invoices
    - Add `visible_by` column to clients table to store which users can see each client

  2. Security
    - Update RLS policies to filter data based on user role
    - Add policies for exploit users to see only their own data
    - Keep full access for admin, compta, and direction roles
*/

-- Add created_by column to transport_slips
ALTER TABLE transport_slips
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add created_by column to freight_slips
ALTER TABLE freight_slips
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add created_by column to client_quotes
ALTER TABLE client_quotes
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add created_by column to client_invoices
ALTER TABLE client_invoices
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add visible_by column to clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS visible_by uuid[] DEFAULT '{}';

-- Update RLS policies for transport_slips
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON transport_slips;
CREATE POLICY "Enable read access for all roles except exploit" ON transport_slips
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) != 'exploit'
    OR
    created_by = auth.uid()
  );

-- Update RLS policies for freight_slips
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON freight_slips;
CREATE POLICY "Enable read access for all roles except exploit" ON freight_slips
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) != 'exploit'
    OR
    created_by = auth.uid()
  );

-- Update RLS policies for client_quotes
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON client_quotes;
CREATE POLICY "Enable read access for all roles except exploit" ON client_quotes
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) != 'exploit'
    OR
    created_by = auth.uid()
  );

-- Update RLS policies for client_invoices
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON client_invoices;
CREATE POLICY "Enable read access for all roles except exploit" ON client_invoices
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) != 'exploit'
    OR
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM invoice_slip_references isr
      JOIN transport_slips ts ON isr.slip_id = ts.id AND isr.slip_type = 'transport'
      WHERE isr.invoice_id = client_invoices.id AND ts.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM invoice_slip_references isr
      JOIN freight_slips fs ON isr.slip_id = fs.id AND isr.slip_type = 'freight'
      WHERE isr.invoice_id = client_invoices.id AND fs.created_by = auth.uid()
    )
  );

-- Update RLS policies for clients
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
CREATE POLICY "Enable read access for all roles except exploit" ON clients
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) != 'exploit'
    OR
    auth.uid() = ANY(visible_by)
    OR
    EXISTS (
      SELECT 1 FROM transport_slips
      WHERE client_id = clients.id AND created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM freight_slips
      WHERE client_id = clients.id AND created_by = auth.uid()
    )
  );

-- Create a function to automatically set created_by on insert
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically set created_by
CREATE TRIGGER set_transport_slips_created_by
  BEFORE INSERT ON transport_slips
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_freight_slips_created_by
  BEFORE INSERT ON freight_slips
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_client_quotes_created_by
  BEFORE INSERT ON client_quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_client_invoices_created_by
  BEFORE INSERT ON client_invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();