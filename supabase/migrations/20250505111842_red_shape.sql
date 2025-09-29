/*
  # Add Loading and Unloading Instructions to Transport Slips

  1. Changes
    - Add loading_instructions text column to transport_slips
    - Add unloading_instructions text column to transport_slips
*/

-- Add instructions columns to transport_slips
ALTER TABLE transport_slips 
ADD COLUMN IF NOT EXISTS loading_instructions text,
ADD COLUMN IF NOT EXISTS unloading_instructions text;