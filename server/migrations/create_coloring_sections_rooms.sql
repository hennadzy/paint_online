-- Coloring SEO sections & rooms schema
-- Creates:
--  - coloring_sections
--  - coloring_rooms
--  - adds room_id to coloring_pages with indexes

CREATE TABLE IF NOT EXISTS coloring_sections (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  seo_text TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS coloring_rooms (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES coloring_sections(id) ON DELETE CASCADE,
  slug VARCHAR(120) NOT NULL,
  title VARCHAR(120) NOT NULL,
  seo_text TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE (section_id, slug)
);

-- Add FK to coloring_pages for room binding
ALTER TABLE coloring_pages
  ADD COLUMN IF NOT EXISTS room_id INTEGER REFERENCES coloring_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coloring_pages_room_id ON coloring_pages(room_id);
CREATE INDEX IF NOT EXISTS idx_coloring_pages_active_room ON coloring_pages(room_id, is_active);
