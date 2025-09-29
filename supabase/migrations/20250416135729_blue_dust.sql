/*
  # Update Commercial Field to Commercial ID

  1. Changes
    - Remove commercial text column
    - Add commercial_id uuid column with foreign key to users table
*/

-- Remove old commercial column
ALTER TABLE freight_slips 
DROP COLUMN IF EXISTS commercial;

-- Add commercial_id column
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS commercial_id uuid REFERENCES users(id);