/*
  # Initial Schema Setup for Transport Management System

  1. New Tables
    - `users`: Basic user information for logging
    - `clients`: Client/customer information
    - `fournisseurs`: Supplier information
    - `vehicules`: Vehicle information
    - `affretements`: Freight management
    - `livraisons`: Delivery management

  2. Security
    - Enable RLS on all tables
    - Add basic read policies
*/

-- Users table for basic logging
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  contact_nom text,
  contact_service text,
  email text,
  telephone text,
  adresse_facturation text,
  preference_facturation text CHECK (preference_facturation IN ('mensuelle', 'hebdomadaire', 'par_transport')),
  tva_rate decimal DEFAULT 20.0,
  numero_commande_requis boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fournisseurs table
CREATE TABLE IF NOT EXISTS fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  contact_nom text,
  email text,
  telephone text,
  services_offerts text[],
  zones_couvertes text[],
  conditions_paiement text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vehicules table
CREATE TABLE IF NOT EXISTS vehicules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  immatriculation text UNIQUE NOT NULL,
  type text NOT NULL,
  capacite_kg decimal,
  capacite_m3 decimal,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Affretements table
CREATE TABLE IF NOT EXISTS affretements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text CHECK (status IN ('loaded', 'waiting', 'delivered', 'dispute')) DEFAULT 'waiting',
  date_affretement date NOT NULL,
  client_id uuid REFERENCES clients(id),
  fournisseur_id uuid REFERENCES fournisseurs(id),
  adresse_chargement text NOT NULL,
  cp_chargement text NOT NULL,
  date_chargement date NOT NULL,
  adresse_livraison text NOT NULL,
  cp_livraison text NOT NULL,
  date_livraison date NOT NULL,
  prix_achat decimal NOT NULL,
  prix_vente decimal NOT NULL,
  marge decimal GENERATED ALWAYS AS (prix_vente - prix_achat) STORED,
  taux_marge decimal GENERATED ALWAYS AS ((prix_vente - prix_achat) / prix_vente * 100) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Livraisons table
CREATE TABLE IF NOT EXISTS livraisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text CHECK (status IN ('loaded', 'waiting', 'delivered', 'dispute')) DEFAULT 'waiting',
  client_id uuid REFERENCES clients(id),
  numero_affretement text,
  vehicule_id uuid REFERENCES vehicules(id),
  adresse_chargement text NOT NULL,
  cp_chargement text NOT NULL,
  date_chargement date NOT NULL,
  adresse_livraison text NOT NULL,
  cp_livraison text NOT NULL,
  date_livraison date NOT NULL,
  kilometres decimal NOT NULL,
  prix_ht decimal NOT NULL,
  prix_km decimal GENERATED ALWAYS AS (prix_ht / NULLIF(kilometres, 0)) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE affretements ENABLE ROW LEVEL SECURITY;
ALTER TABLE livraisons ENABLE ROW LEVEL SECURITY;

-- Create basic read policies
CREATE POLICY "Enable read access for authenticated users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON fournisseurs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON vehicules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON affretements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON livraisons
  FOR SELECT TO authenticated USING (true);