-- Update existing coloring sections with placeholder images
-- This script adds sample image URLs to existing sections

-- Update sections with relevant placeholder images based on their slug/title
UPDATE coloring_sections 
SET image_url = '/uploads/coloring/cartoons-section.jpg'
WHERE slug = 'cartoons' OR title ILIKE '%мультфильм%';

UPDATE coloring_sections 
SET image_url = '/uploads/coloring/animals-section.jpg'
WHERE slug = 'animals' OR title ILIKE '%животн%';

UPDATE coloring_sections 
SET image_url = '/uploads/coloring/cars-section.jpg'
WHERE slug = 'cars' OR title ILIKE '%машин%';

UPDATE coloring_sections 
SET image_url = '/uploads/coloring/princess-section.jpg'
WHERE slug = 'princess' OR title ILIKE '%принцесс%';

UPDATE coloring_sections 
SET image_url = '/uploads/coloring/nature-section.jpg'
WHERE slug = 'nature' OR title ILIKE '%природ%';

UPDATE coloring_sections 
SET image_url = '/uploads/coloring/space-section.jpg'
WHERE slug = 'space' OR title ILIKE '%космос%';

UPDATE coloring_sections 
SET image_url = '/uploads/coloring/fairytales-section.jpg'
WHERE slug = 'fairytales' OR title ILIKE '%сказк%';

UPDATE coloring_sections 
SET image_url = '/uploads/coloring/transport-section.jpg'
WHERE slug = 'transport' OR title ILIKE '%транспорт%';

-- For any remaining sections without images, set a default
UPDATE coloring_sections 
SET image_url = '/uploads/coloring/default-section.jpg'
WHERE image_url IS NULL;
