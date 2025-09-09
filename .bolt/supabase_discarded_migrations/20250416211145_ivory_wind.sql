/*
  # Add Price Fields to Freight Slips

  1. Changes
    - Add purchase_price column for storing the buying price
    - Add computed columns for margin and margin rate
    - Ensure price column is used for selling price
*/

-- Add purchase_price column if it doesn't exist
ALTER TABLE freight_slips 
ADD COLUMN IF NOT EXISTS purchase_price numeric;

-- Add computed columns for margin and margin rate
ALTER TABLE freight_slips
ADD COLUMN IF NOT EXISTS margin numeric GENERATED ALWAYS AS (price - purchase_price) STORED,
ADD COLUMN IF NOT EXISTS margin_rate numeric GENERATED ALWAYS AS (((price - purchase_price) / NULLIF(price, 0)) * 100) STORED;

-- Add comment to clarify price column usage
COMMENT ON COLUMN freight_slips.price IS 'Selling price (Prix de vente HT)';
COMMENT ON COLUMN freight_slips.purchase_price IS 'Purchase price (Prix d''achat HT)';