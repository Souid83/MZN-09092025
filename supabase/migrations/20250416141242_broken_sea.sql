/*
  # Authentication System Setup

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `role` (text with check constraint)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on users table
    - Add policies for admin access
*/

-- Create users table with role as TEXT
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'EXPLOITATION', 'FACTURATION')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow admins full access"
  ON users
  USING (
    auth.uid() IN (
      SELECT id 
      FROM users 
      WHERE role = 'ADMIN'
    )
  );

CREATE POLICY "Allow users to read their own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin user (Salomé)
INSERT INTO users (email, name, role)
VALUES (
  'salome@mzntransport.fr',
  'Salomé',
  'ADMIN'
) ON CONFLICT (email) DO NOTHING;