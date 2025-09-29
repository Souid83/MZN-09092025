/*
  # Add observations column to transport_slips table

  1. Changes
    - Add observations text column to transport_slips table
*/

-- Add observations column to transport_slips
ALTER TABLE transport_slips 
ADD COLUMN IF NOT EXISTS observations text;