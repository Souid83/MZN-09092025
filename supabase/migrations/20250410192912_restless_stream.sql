/*
  # Add Contact Management for Clients

  1. New Tables
    - `client_contacts`: Store multiple contacts per client
    - `client_accounting_contacts`: Store dedicated accounting contact per client

  2. Changes
    - Remove contact fields from clients table as they're now in dedicated tables
*/

-- Create client_contacts table
CREATE TABLE IF NOT EXISTS client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  service text NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  email text,
  telephone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create client_accounting_contacts table
CREATE TABLE IF NOT EXISTS client_accounting_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  nom text NOT NULL,
  prenom text NOT NULL,
  email text,
  telephone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Remove old contact columns from clients table
ALTER TABLE clients 
  DROP COLUMN IF EXISTS contact_nom,
  DROP COLUMN IF EXISTS contact_service;