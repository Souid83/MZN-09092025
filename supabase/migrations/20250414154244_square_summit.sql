/*
  # Add documents column to slips tables

  1. Changes
    - Add documents JSONB column to transport_slips and freight_slips tables
    - Column will store document URLs and metadata
    - Structure: {
        "cmr": { "url": "...", "uploaded_at": "..." },
        "client_order": { "url": "...", "uploaded_at": "..." },
        "payment_attestation": { "url": "...", "uploaded_at": "..." }
      }
*/

-- Add documents column to transport_slips
ALTER TABLE transport_slips
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}'::jsonb;

-- Add documents column to freight_slips
ALTER TABLE freight_slips
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}'::jsonb;