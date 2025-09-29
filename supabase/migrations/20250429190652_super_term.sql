/*
  # Add Time Fields to Freight Slips

  1. Changes
    - Add loading_time_start and loading_time_end for loading time range
    - Add delivery_time_start and delivery_time_end for delivery time range
    - Keep existing time fields for backward compatibility
*/

-- Add new time fields
ALTER TABLE freight_slips
ADD COLUMN IF NOT EXISTS loading_time_start time,
ADD COLUMN IF NOT EXISTS loading_time_end time,
ADD COLUMN IF NOT EXISTS delivery_time_start time,
ADD COLUMN IF NOT EXISTS delivery_time_end time;