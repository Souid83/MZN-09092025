/*
  # Create Transport Management Tables

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `nom` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `contacts`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `nom` (text)
      - `email` (text)
      - `telephone` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `fournisseurs`
      - `id` (uuid, primary key)
      - `nom` (text)
      - `telephone` (text)
      - `email` (text)
      - `services_offerts` (text)
      - `zones_couvertes` (text)
      - `conditions_paiement` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `transport_slips`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `freight_slips`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `fournisseur_id` (uuid, foreign key to fournisseurs)
      - `number` (text)
      - `status` (text)
      - `loading_date` (date)
      - `loading_time` (time)
      - `loading_address` (text)
      - `loading_contact` (text)
      - `delivery_date` (date)
      - `delivery_time` (time)
      - `delivery_address` (text)
      - `delivery_contact` (text)
      - `goods_description` (text)
      - `volume` (numeric)
      - `weight` (numeric)
      - `vehicle_type` (text)
      - `exchange_type` (text)
      - `instructions` (text)
      - `price` (numeric)
      - `payment_method` (text)
      - `observations` (text)
      - `photo_required` (boolean)
      - `documents` (jsonb)
      - `commercial_id` (uuid)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nom text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    nom text NOT NULL,
    email text,
    telephone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create fournisseurs table
CREATE TABLE IF NOT EXISTS fournisseurs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nom text NOT NULL,
    telephone text,
    email text,
    services_offerts text,
    zones_couvertes text,
    conditions_paiement text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create transport_slips table
CREATE TABLE IF NOT EXISTS transport_slips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create freight_slips table
CREATE TABLE IF NOT EXISTS freight_slips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    number text NOT NULL,
    status text NOT NULL,
    client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
    fournisseur_id uuid REFERENCES fournisseurs(id) ON DELETE SET NULL,
    loading_date date,
    loading_time time,
    loading_address text,
    loading_contact text,
    delivery_date date,
    delivery_time time,
    delivery_address text,
    delivery_contact text,
    goods_description text,
    volume numeric,
    weight numeric,
    vehicle_type text,
    exchange_type text,
    instructions text,
    price numeric,
    payment_method text,
    observations text,
    photo_required boolean DEFAULT false,
    documents jsonb DEFAULT '[]',
    commercial_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_slips ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read clients"
    ON clients FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to read contacts"
    ON contacts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to read fournisseurs"
    ON fournisseurs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to read transport_slips"
    ON transport_slips FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to read freight_slips"
    ON freight_slips FOR SELECT
    TO authenticated
    USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_transport_slips_client_id ON transport_slips(client_id);
CREATE INDEX IF NOT EXISTS idx_freight_slips_client_id ON freight_slips(client_id);
CREATE INDEX IF NOT EXISTS idx_freight_slips_fournisseur_id ON freight_slips(fournisseur_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fournisseurs_updated_at
    BEFORE UPDATE ON fournisseurs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transport_slips_updated_at
    BEFORE UPDATE ON transport_slips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_freight_slips_updated_at
    BEFORE UPDATE ON freight_slips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();