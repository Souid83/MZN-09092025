/*
  # Update Vehicle Types and Add Tailgate Option

  1. Changes
    - Add tailgate column to freight_slips table
    - Add custom_vehicle_type column for "Autre" option
*/

-- Add tailgate field if not exists
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS tailgate boolean DEFAULT false;

-- Add custom vehicle type field if not exists
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS custom_vehicle_type text;