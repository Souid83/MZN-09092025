/*
  # Update Role ENUM Policies

  1. Changes
    - Drop existing policies that use role comparison
    - Recreate policies with proper ENUM casting
    - Ensure all role comparisons use ::user_role cast
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow admins full access" ON users;
DROP POLICY IF EXISTS "Allow users to read their own data" ON users;

-- Recreate policies with proper ENUM casting
CREATE POLICY "Allow admins full access"
  ON users
  USING (
    auth.uid() IN (
      SELECT id 
      FROM users 
      WHERE role = 'ADMIN'::user_role
    )
  );

CREATE POLICY "Allow users to read their own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Add policy for exploitation users
CREATE POLICY "Allow exploitation users to manage slips"
  ON freight_slips
  USING (
    auth.uid() IN (
      SELECT id 
      FROM users 
      WHERE role IN ('ADMIN'::user_role, 'EXPLOITATION'::user_role)
    )
  );

-- Add policy for facturation users
CREATE POLICY "Allow facturation users to manage invoices"
  ON freight_slips
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id 
      FROM users 
      WHERE role IN ('ADMIN'::user_role, 'FACTURATION'::user_role)
    )
  );

-- Add similar policies for transport_slips
CREATE POLICY "Allow exploitation users to manage transport slips"
  ON transport_slips
  USING (
    auth.uid() IN (
      SELECT id 
      FROM users 
      WHERE role IN ('ADMIN'::user_role, 'EXPLOITATION'::user_role)
    )
  );

CREATE POLICY "Allow facturation users to manage transport invoices"
  ON transport_slips
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id 
      FROM users 
      WHERE role IN ('ADMIN'::user_role, 'FACTURATION'::user_role)
    )
  );