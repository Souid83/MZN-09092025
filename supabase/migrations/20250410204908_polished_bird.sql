/*
  # Add countries table and country fields to clients and fournisseurs

  1. New Tables
    - `countries`: Store country information
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `code` (text, 2-letter country code)
      - `flag_url` (text, URL to flag image)

  2. Changes
    - Add country_id field to clients and fournisseurs tables
    - Add foreign key constraints

  3. Initial Data
    - Insert initial set of countries
*/

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text NOT NULL,
  flag_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add country_id to clients and fournisseurs
ALTER TABLE clients ADD COLUMN country_id uuid REFERENCES countries(id);
ALTER TABLE fournisseurs ADD COLUMN country_id uuid REFERENCES countries(id);

-- Insert initial countries
INSERT INTO countries (name, code, flag_url) VALUES
  ('France', 'FR', 'https://flagcdn.com/fr.svg'),
  ('Espagne', 'ES', 'https://flagcdn.com/es.svg'),
  ('Italie', 'IT', 'https://flagcdn.com/it.svg'),
  ('Belgique', 'BE', 'https://flagcdn.com/be.svg'),
  ('Royaume-Uni', 'GB', 'https://flagcdn.com/gb.svg'),
  ('Australie', 'AU', 'https://flagcdn.com/au.svg'),
  ('Allemagne', 'DE', 'https://flagcdn.com/de.svg'),
  ('Portugal', 'PT', 'https://flagcdn.com/pt.svg'),
  ('Pologne', 'PL', 'https://flagcdn.com/pl.svg'),
  ('Roumanie', 'RO', 'https://flagcdn.com/ro.svg'),
  ('Bulgarie', 'BG', 'https://flagcdn.com/bg.svg'),
  ('Maroc', 'MA', 'https://flagcdn.com/ma.svg'),
  ('Lituanie', 'LT', 'https://flagcdn.com/lt.svg'),
  ('Luxembourg', 'LU', 'https://flagcdn.com/lu.svg')
ON CONFLICT (name) DO NOTHING;