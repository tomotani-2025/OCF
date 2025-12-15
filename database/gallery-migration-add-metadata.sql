-- Gallery Metadata Migration
-- Adds new metadata fields to existing album_images table
-- Run this in Supabase SQL Editor

-- Add new metadata columns to album_images table
ALTER TABLE album_images
ADD COLUMN IF NOT EXISTS title VARCHAR(500),
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS photographer VARCHAR(255),
ADD COLUMN IF NOT EXISTS photo_date DATE,
ADD COLUMN IF NOT EXISTS location VARCHAR(500),
ADD COLUMN IF NOT EXISTS tags TEXT;

-- Create indexes for metadata search/filter
CREATE INDEX IF NOT EXISTS idx_album_images_category ON album_images(category);
CREATE INDEX IF NOT EXISTS idx_album_images_photographer ON album_images(photographer);
CREATE INDEX IF NOT EXISTS idx_album_images_photo_date ON album_images(photo_date);
CREATE INDEX IF NOT EXISTS idx_album_images_location ON album_images(location);

-- Verify the migration
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'album_images'
ORDER BY ordinal_position;
