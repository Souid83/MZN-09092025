/*
  # Add metre column to freight_slips table

  1. Changes
    - Add metre numeric column to freight_slips table
    - This will store the length in meters for freight items
*/

-- Add metre column to freight_slips
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS metre numeric;