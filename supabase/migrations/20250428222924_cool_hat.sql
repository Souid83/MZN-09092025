/*
  # Add tailgate field and update vehicle types

  1. Changes
    - Add tailgate boolean field to freight_slips table
    - Add custom_vehicle_type text field for "Autre" option
*/

-- Add tailgate field
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS tailgate boolean DEFAULT false;

-- Add custom vehicle type field
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS custom_vehicle_type text;