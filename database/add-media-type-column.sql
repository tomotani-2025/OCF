-- Add media_type column to album_images table
-- Supports 'image' (default) and 'video' types for MP4/MOV files
ALTER TABLE album_images
    ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'image';

-- Update any existing video entries (based on file extension)
UPDATE album_images
    SET media_type = 'video'
    WHERE media_type IS NULL
      AND (file_path ILIKE '%.mp4' OR file_path ILIKE '%.mov');

-- Index for filtering by media type
CREATE INDEX IF NOT EXISTS idx_album_images_media_type ON album_images(media_type);
