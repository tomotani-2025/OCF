-- Gallery Management System Schema
-- Omotani Caring Foundation Website

-- Albums table: stores gallery album metadata
CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,                    -- e.g., "2017-2024", "gallery-2"
    label VARCHAR(100) NOT NULL,                   -- e.g., "Archive", "Global", "Recent"
    title VARCHAR(255) NOT NULL,                   -- e.g., "Gallery 2017-2024"
    slug VARCHAR(255) NOT NULL UNIQUE,             -- e.g., "gallery-2017-2024" (for HTML filename)
    directory_name VARCHAR(255) NOT NULL UNIQUE,   -- e.g., "2017-2024" (folder name under images/gallery/)
    cover_image VARCHAR(500),                      -- path to cover image (relative to site/)
    description TEXT,                              -- optional album description
    sort_order INTEGER DEFAULT 0,                  -- order albums appear on gallery.html
    is_active BOOLEAN DEFAULT 1,                   -- whether to show on gallery.html
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Album images table: stores images within each album
CREATE TABLE IF NOT EXISTS album_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL,
    filename VARCHAR(500) NOT NULL,                -- e.g., "img_0049.webp"
    file_path VARCHAR(500) NOT NULL,               -- full path: "images/gallery/2017-2024/img_0049.webp"
    alt_text VARCHAR(500) DEFAULT 'Gallery image', -- alt text for accessibility
    caption TEXT,                                  -- optional image caption
    sort_order INTEGER DEFAULT 0,                  -- order images appear in gallery (from WordPress export)
    width INTEGER,                                 -- image width in pixels (optional, for optimization)
    height INTEGER,                                -- image height in pixels (optional, for optimization)
    file_size INTEGER,                             -- file size in bytes (optional)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_albums_slug ON albums(slug);
CREATE INDEX IF NOT EXISTS idx_albums_is_active ON albums(is_active);
CREATE INDEX IF NOT EXISTS idx_albums_sort_order ON albums(sort_order);
CREATE INDEX IF NOT EXISTS idx_album_images_album_id ON album_images(album_id);
CREATE INDEX IF NOT EXISTS idx_album_images_sort_order ON album_images(sort_order);

-- Insert existing albums
INSERT INTO albums (name, label, title, slug, directory_name, cover_image, sort_order, is_active) VALUES
    ('Global Images', 'Global', 'Global Images', 'global-images', 'global', 'images/orangutan-borneo-1024x683.jpg', 1, 1),
    ('Gallery 2017-2024', 'Archive', 'Gallery 2017-2024', 'gallery-2017-2024', '2017-2024', 'images/gallery/2017-2024/img_0049.webp', 2, 1),
    ('Gallery 2', 'Archive', 'Gallery 2', 'gallery-2', 'gallery-2', 'images/gallery/gallery-2/unknown.webp', 3, 1),
    ('Gallery 3', 'Archive', 'Gallery 3', 'gallery-3', 'gallery-3', 'images/gallery/gallery-3/food-distribution-may-2024-1024x519.webp', 4, 1);

-- Trigger to update updated_at timestamp on albums
CREATE TRIGGER IF NOT EXISTS update_albums_timestamp
AFTER UPDATE ON albums
FOR EACH ROW
BEGIN
    UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Trigger to update updated_at timestamp on album_images
CREATE TRIGGER IF NOT EXISTS update_album_images_timestamp
AFTER UPDATE ON album_images
FOR EACH ROW
BEGIN
    UPDATE album_images SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Example queries for your admin panel:

-- Get all active albums ordered by sort_order
-- SELECT * FROM albums WHERE is_active = 1 ORDER BY sort_order;

-- Get all images in an album ordered by sort_order
-- SELECT * FROM album_images WHERE album_id = ? ORDER BY sort_order;

-- Move image to different album
-- UPDATE album_images SET album_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;

-- Get image count per album
-- SELECT a.id, a.title, COUNT(ai.id) as image_count
-- FROM albums a
-- LEFT JOIN album_images ai ON a.id = ai.album_id
-- GROUP BY a.id;

-- Reorder images in album (after drag-and-drop)
-- UPDATE album_images SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;
