-- Gallery Management System Schema
-- Omotani Caring Foundation Website
-- PostgreSQL / Supabase Version

-- Albums table: stores gallery album metadata
CREATE TABLE IF NOT EXISTS albums (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,                    -- e.g., "2017-2024", "gallery-2"
    label VARCHAR(100) NOT NULL,                   -- e.g., "Archive", "Global", "Recent"
    title VARCHAR(255) NOT NULL,                   -- e.g., "Gallery 2017-2024"
    slug VARCHAR(255) NOT NULL UNIQUE,             -- e.g., "gallery-2017-2024" (for HTML filename)
    directory_name VARCHAR(255) NOT NULL UNIQUE,   -- e.g., "2017-2024" (folder name under images/gallery/)
    cover_image VARCHAR(500),                      -- path to cover image (relative to site/)
    description TEXT,                              -- optional album description
    sort_order INTEGER DEFAULT 0,                  -- order albums appear on gallery.html
    is_active BOOLEAN DEFAULT true,                -- whether to show on gallery.html
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Album images table: stores images within each album
CREATE TABLE IF NOT EXISTS album_images (
    id SERIAL PRIMARY KEY,
    album_id INTEGER NOT NULL,
    filename VARCHAR(500) NOT NULL,                -- e.g., "img_0049.webp"
    file_path VARCHAR(500) NOT NULL,               -- full path: "images/gallery/2017-2024/img_0049.webp"

    -- Basic metadata
    title VARCHAR(500),                            -- image title for search/display
    alt_text VARCHAR(500) DEFAULT 'Gallery image', -- alt text for accessibility
    caption TEXT,                                  -- optional image caption

    -- Search/filter metadata
    category VARCHAR(255),                         -- e.g., "Batwa", "Nepal", "Wildlife"
    photographer VARCHAR(255),                     -- photographer name/credit
    photo_date DATE,                               -- date photo was taken
    location VARCHAR(500),                         -- location where photo was taken
    tags TEXT,                                     -- comma-separated tags for search

    -- Technical metadata
    sort_order INTEGER DEFAULT 0,                  -- order images appear in gallery (from WordPress export)
    width INTEGER,                                 -- image width in pixels (optional, for optimization)
    height INTEGER,                                -- image height in pixels (optional, for optimization)
    file_size INTEGER,                             -- file size in bytes (optional)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_album
        FOREIGN KEY (album_id)
        REFERENCES albums(id)
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_albums_slug ON albums(slug);
CREATE INDEX IF NOT EXISTS idx_albums_is_active ON albums(is_active);
CREATE INDEX IF NOT EXISTS idx_albums_sort_order ON albums(sort_order);
CREATE INDEX IF NOT EXISTS idx_album_images_album_id ON album_images(album_id);
CREATE INDEX IF NOT EXISTS idx_album_images_sort_order ON album_images(sort_order);

-- Indexes for metadata search/filter
CREATE INDEX IF NOT EXISTS idx_album_images_category ON album_images(category);
CREATE INDEX IF NOT EXISTS idx_album_images_photographer ON album_images(photographer);
CREATE INDEX IF NOT EXISTS idx_album_images_photo_date ON album_images(photo_date);
CREATE INDEX IF NOT EXISTS idx_album_images_location ON album_images(location);

-- Insert existing albums
INSERT INTO albums (name, label, title, slug, directory_name, cover_image, sort_order, is_active) VALUES
    ('Global Images', 'Global', 'Global Images', 'global-images', 'global', 'images/orangutan-borneo-1024x683.jpg', 1, true),
    ('Gallery 2017-2024', 'Archive', 'Gallery 2017-2024', 'gallery-2017-2024', '2017-2024', 'images/gallery/2017-2024/img_0049.webp', 2, true),
    ('Gallery 2', 'Archive', 'Gallery 2', 'gallery-2', 'gallery-2', 'images/gallery/gallery-2/unknown.webp', 3, true),
    ('Gallery 3', 'Archive', 'Gallery 3', 'gallery-3', 'gallery-3', 'images/gallery/gallery-3/food-distribution-may-2024-1024x519.webp', 4, true)
ON CONFLICT (slug) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp on albums
DROP TRIGGER IF EXISTS update_albums_timestamp ON albums;
CREATE TRIGGER update_albums_timestamp
    BEFORE UPDATE ON albums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at timestamp on album_images
DROP TRIGGER IF EXISTS update_album_images_timestamp ON album_images;
CREATE TRIGGER update_album_images_timestamp
    BEFORE UPDATE ON album_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Example queries for your admin panel:

-- Get all active albums ordered by sort_order
-- SELECT * FROM albums WHERE is_active = true ORDER BY sort_order;

-- Get all images in an album ordered by sort_order
-- SELECT * FROM album_images WHERE album_id = $1 ORDER BY sort_order;

-- Move image to different album
-- UPDATE album_images SET album_id = $1, updated_at = NOW() WHERE id = $2;

-- Get image count per album
-- SELECT a.id, a.title, COUNT(ai.id) as image_count
-- FROM albums a
-- LEFT JOIN album_images ai ON a.id = ai.album_id
-- GROUP BY a.id;

-- Reorder images in album (after drag-and-drop)
-- UPDATE album_images SET sort_order = $1, updated_at = NOW() WHERE id = $2;

-- Enable Row Level Security (RLS) for Supabase
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_images ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to albums" ON albums
    FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read access to album images" ON album_images
    FOR SELECT USING (true);

-- Create policies for authenticated admin access (adjust role as needed)
CREATE POLICY "Allow admin full access to albums" ON albums
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow admin full access to album images" ON album_images
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
