-- =====================================================
-- Post Categories Table
-- Omotani Caring Foundation
-- Run this script in Supabase SQL Editor
-- =====================================================
-- Stores the managed list of post categories so they appear in the
-- admin dropdown even when no post is currently assigned to them.
-- The posts.category column is still free-text TEXT; this table is
-- the source of truth for the *dropdown options*.

CREATE TABLE IF NOT EXISTS post_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_categories_sort ON post_categories(sort_order);

ALTER TABLE post_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on post_categories"
    ON post_categories FOR SELECT
    USING (true);

CREATE POLICY "Allow public write access on post_categories"
    ON post_categories FOR ALL
    USING (true)
    WITH CHECK (true);

-- Reuse the shared updated_at trigger function from admin-content-tables.sql
DROP TRIGGER IF EXISTS update_post_categories_updated_at ON post_categories;
CREATE TRIGGER update_post_categories_updated_at
    BEFORE UPDATE ON post_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed the four built-in defaults
INSERT INTO post_categories (id, name, sort_order) VALUES
    ('batwa', 'Batwa', 0),
    ('bwindi', 'Bwindi', 1),
    ('nepal', 'Nepal', 2),
    ('base-camp-for-veterans', 'Base Camp For Veterans', 3)
ON CONFLICT (id) DO NOTHING;

-- Backfill any categories already in use by posts but not yet in this table
INSERT INTO post_categories (id, name, sort_order)
SELECT
    LOWER(REGEXP_REPLACE(category, '[^a-zA-Z0-9]+', '-', 'g')),
    category,
    100
FROM (SELECT DISTINCT category FROM posts WHERE category IS NOT NULL AND category <> '') AS existing
ON CONFLICT (id) DO NOTHING;
