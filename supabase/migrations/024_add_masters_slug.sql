-- Migration 024: Add slug field to masters table
ALTER TABLE masters ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Update existing masters with their slugs
UPDATE masters SET slug = 'master-luna' WHERE display_name = 'Master Luna';
UPDATE masters SET slug = 'zhang-yihua' WHERE display_name = 'Master Zhang Yihua';
UPDATE masters SET slug = 'wu-yang' WHERE display_name = 'Master Wu Yang';
UPDATE masters SET slug = 'master-lin' WHERE display_name = 'Master Lin';
UPDATE masters SET slug = 'master-han' WHERE display_name = 'Master Han';
UPDATE masters SET slug = 'master-elena' WHERE display_name = 'Master Elena';

-- For any remaining masters, generate slug from display_name
UPDATE masters SET slug = LOWER(REPLACE(REPLACE(display_name, ' ', '-'), '''', '')) WHERE slug IS NULL;

-- Add not null constraint after populating
ALTER TABLE masters ALTER COLUMN slug SET NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_masters_slug ON masters(slug);
