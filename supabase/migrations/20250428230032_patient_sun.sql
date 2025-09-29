-- Add tailgate and custom_vehicle_type fields to transport_slips
ALTER TABLE transport_slips 
ADD COLUMN IF NOT EXISTS tailgate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_vehicle_type text;