/*
  # Attribution clients par employé

  1. New Tables
    - `user_clients`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users.id)
      - `client_id` (uuid, foreign key to clients.id)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_clients` table
    - Add policy for admin users to manage attributions
    - Add policy for users to read their own attributions

  3. Constraints
    - Unique constraint on (user_id, client_id) to prevent duplicates
*/

-- Create user_clients table
CREATE TABLE IF NOT EXISTS user_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, client_id)
);

-- Enable RLS
ALTER TABLE user_clients ENABLE ROW LEVEL SECURITY;

-- Policies for user_clients table
CREATE POLICY "Admin users can manage all user client attributions"
  ON user_clients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can read their own client attributions"
  ON user_clients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_clients_user_id ON user_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clients_client_id ON user_clients(client_id);