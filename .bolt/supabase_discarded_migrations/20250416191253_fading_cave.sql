/*
  # Add margin columns to freight_slips table

  1. Changes
    - Add `margin` column (numeric, computed from price difference)
    - Add `margin_rate` column (numeric, computed as percentage)

  2. Details
    - Both columns are computed automatically
    - Margin = selling_price - price
    - Margin rate = (margin / selling_price) * 100
*/

ALTER TABLE freight_slips
ADD COLUMN IF NOT EXISTS margin numeric GENERATED ALWAYS AS (price - purchase_price) STORED,
ADD COLUMN IF NOT EXISTS margin_rate numeric GENERATED ALWAYS AS (((price - purchase_price) / NULLIF(price, 0)) * 100) STORED;