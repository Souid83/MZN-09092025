/*
  # Create Transport and Freight Slips Tables

  1. New Tables
    - `slip_number_configs`
      - `id` (uuid, primary key)
      - `prefix` (text)
      - `current_number` (integer)
      - `type` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transport_slips`
      - `id` (uuid, primary key)
      - `number` (text)
      - `client_id` (uuid, foreign key)
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
      - `order_number` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `freight_slips`
      - Similar structure to transport_slips but without order_number

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create slip_number_configs table
CREATE TABLE IF NOT EXISTS slip_number_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text NOT NULL,
  current_number integer NOT NULL DEFAULT 1,
  type text NOT NULL CHECK (type IN ('transport', 'freight')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE slip_number_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users"
  ON slip_number_configs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update access for authenticated users"
  ON slip_number_configs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create transport_slips table
CREATE TABLE IF NOT EXISTS transport_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  client_id uuid REFERENCES clients(id) ON DELETE RESTRICT,
  loading_date date NOT NULL,
  loading_time time NOT NULL,
  loading_address text NOT NULL,
  loading_contact text NOT NULL,
  delivery_date date NOT NULL,
  delivery_time time NOT NULL,
  delivery_address text NOT NULL,
  delivery_contact text NOT NULL,
  goods_description text NOT NULL,
  volume numeric,
  weight numeric,
  vehicle_type text NOT NULL,
  exchange_type text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  price numeric NOT NULL,
  payment_method text NOT NULL,
  observations text,
  photo_required boolean NOT NULL DEFAULT true,
  order_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transport_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users"
  ON transport_slips
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON transport_slips
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create freight_slips table
CREATE TABLE IF NOT EXISTS freight_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  client_id uuid REFERENCES clients(id) ON DELETE RESTRICT,
  loading_date date NOT NULL,
  loading_time time NOT NULL,
  loading_address text NOT NULL,
  loading_contact text NOT NULL,
  delivery_date date NOT NULL,
  delivery_time time NOT NULL,
  delivery_address text NOT NULL,
  delivery_contact text NOT NULL,
  goods_description text NOT NULL,
  volume numeric,
  weight numeric,
  vehicle_type text NOT NULL,
  exchange_type text NOT NULL,
  instructions text NOT NULL DEFAULT 'BIEN ARRIMER LA MARCHANDISE',
  price numeric NOT NULL,
  payment_method text NOT NULL,
  observations text,
  photo_required boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE freight_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users"
  ON freight_slips
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON freight_slips
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert initial slip number configs
INSERT INTO slip_number_configs (prefix, current_number, type)
VALUES 
  ('2025', 1000, 'transport'),
  ('2025', 1000, 'freight')
ON CONFLICT DO NOTHING;