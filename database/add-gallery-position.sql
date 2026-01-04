-- Add gallery_at_bottom column to posts table
-- Run this in Supabase SQL Editor

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS gallery_at_bottom BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN posts.gallery_at_bottom IS 'When true, display gallery at bottom of post instead of top';
