/*
  # Create Users Table and Add Initial Users

  1. New Table
    - `users`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text, unique)
      - `role` (text with check constraint)
      - `created_at` (timestamp)

  2. Initial Data
    - Add 4 initial users with specified roles
    
  3. Security
    - Enable RLS
    - Add policies for user management
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'exploit', 'compta', 'direction')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin users can manage all users"
  ON users
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Insert initial users
INSERT INTO users (name, email, role)
VALUES 
  ('Salomé', 'salome@mzn.fr', 'admin'),
  ('Orlane', 'orlane@mzn.fr', 'admin'),
  ('Eliot', 'eliot@mzn.fr', 'exploit'),
  ('Mehdi', 'mehdi@mzn.fr', 'exploit')
ON CONFLICT (email) DO NOTHING;