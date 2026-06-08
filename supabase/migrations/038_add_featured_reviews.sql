-- Add featured column to reviews table
-- 2026-06-07

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reviews' AND column_name = 'featured') THEN
        ALTER TABLE reviews ADD COLUMN featured BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add location column to profiles table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE profiles ADD COLUMN location VARCHAR(100);
    END IF;
END $$;

-- Create index for featured reviews
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(featured) WHERE featured = TRUE;

SELECT 'featured and location columns added' as status;
