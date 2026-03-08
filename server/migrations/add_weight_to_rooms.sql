-- Add weight column to rooms table for storing room size in bytes
ALTER TABLE rooms ADD COLUMN weight INTEGER DEFAULT 0;

-- Create index for faster sorting by weight
CREATE INDEX IF NOT EXISTS idx_rooms_weight ON rooms(weight);
