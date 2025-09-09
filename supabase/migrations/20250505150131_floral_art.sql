/*
  # Add metre field to freight slips

  1. Changes
    - Add metre numeric column to freight_slips table
*/

-- Add metre column to freight_slips
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS metre numeric;