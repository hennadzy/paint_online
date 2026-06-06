-- Add image_url column to coloring_sections table
ALTER TABLE coloring_sections
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN coloring_sections.image_url IS 'URL или путь к изображению превью раздела';
