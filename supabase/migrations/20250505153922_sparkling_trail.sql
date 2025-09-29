/*
  # Add loading/unloading instructions and kilometers to transport_slips

  1. Changes
    - Add loading_instructions text column
    - Add unloading_instructions text column
    - Add kilometers numeric column
*/

-- Add new columns to transport_slips
ALTER TABLE transport_slips 
ADD COLUMN IF NOT EXISTS loading_instructions text,
ADD COLUMN IF NOT EXISTS unloading_instructions text,
ADD COLUMN IF NOT EXISTS kilometers numeric;