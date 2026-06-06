-- Add sort_order column to coloring_sections
ALTER TABLE coloring_sections 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set initial sort_order based on created_at (newest first)
UPDATE coloring_sections 
SET sort_order = (
  SELECT COUNT(*) 
  FROM coloring_sections cs2 
  WHERE cs2.created_at > coloring_sections.created_at
);

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_coloring_sections_sort_order 
ON coloring_sections(sort_order, created_at);
