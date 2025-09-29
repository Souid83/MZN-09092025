/*
  # Add Time Range Fields to Transport Slips

  1. Changes
    - Add loading_time_start and loading_time_end columns to transport_slips
    - Add delivery_time_start and delivery_time_end columns to transport_slips
    - Match the same structure as freight_slips for time range handling
*/

-- Add time range fields to transport_slips
ALTER TABLE transport_slips
ADD COLUMN IF NOT EXISTS loading_time_start time,
ADD COLUMN IF NOT EXISTS loading_time_end time,
ADD COLUMN IF NOT EXISTS delivery_time_start time,
ADD COLUMN IF NOT EXISTS delivery_time_end time;