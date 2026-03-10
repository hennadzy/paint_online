ALTER TABLE rooms ADD COLUMN weight INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_rooms_weight ON rooms(weight);
