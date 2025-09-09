/*
  # Add Margin Calculations to Freight Slips

  1. Changes
    - Add margin column as computed column (price - purchase_price)
    - Add margin_rate column as computed column ((price - purchase_price) / price * 100)
*/

ALTER TABLE freight_slips
ADD COLUMN IF NOT EXISTS purchase_price numeric,
ADD COLUMN IF NOT EXISTS margin numeric GENERATED ALWAYS AS (price - purchase_price) STORED,
ADD COLUMN IF NOT EXISTS margin_rate numeric GENERATED ALWAYS AS (((price - purchase_price) / NULLIF(price, 0)) * 100) STORED;