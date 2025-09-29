/*
  # Add opening hours to clients table

  1. Changes
    - Add opening_hours JSONB column to clients table to store weekly schedule
*/

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS opening_hours JSONB;