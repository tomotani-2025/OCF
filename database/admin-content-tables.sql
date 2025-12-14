-- =====================================================
-- Admin Content Management Tables
-- Omotani Caring Foundation
-- Run this script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ABOUT US CONTENT TABLE
-- Stores trustees text and advisor cards
-- =====================================================
CREATE TABLE IF NOT EXISTS about_content (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('trustees', 'advisor')),
    content TEXT,  -- For trustees: the text content
    data JSONB,    -- For advisors: JSON with name, title, photo, bio, links, etc.
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster type queries
CREATE INDEX IF NOT EXISTS idx_about_content_type ON about_content(type);
CREATE INDEX IF NOT EXISTS idx_about_content_sort ON about_content(sort_order);

-- Enable RLS
ALTER TABLE about_content ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access on about_content"
    ON about_content FOR SELECT
    USING (true);

-- Public write access (for admin panel - consider restricting in production)
CREATE POLICY "Allow public write access on about_content"
    ON about_content FOR ALL
    USING (true)
    WITH CHECK (true);


-- =====================================================
-- 2. MISSION STATEMENTS TABLE
-- Stores the mission statement text blocks
-- =====================================================
CREATE TABLE IF NOT EXISTS mission_statements (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    full_width BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_mission_statements_sort ON mission_statements(sort_order);

-- Enable RLS
ALTER TABLE mission_statements ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access on mission_statements"
    ON mission_statements FOR SELECT
    USING (true);

-- Public write access
CREATE POLICY "Allow public write access on mission_statements"
    ON mission_statements FOR ALL
    USING (true)
    WITH CHECK (true);


-- =====================================================
-- 3. MISSION GOAL CARDS TABLE
-- Stores the goal preview cards on Our Mission page
-- =====================================================
CREATE TABLE IF NOT EXISTS mission_goal_cards (
    id TEXT PRIMARY KEY,
    label TEXT,           -- e.g., "Goal One:"
    title TEXT NOT NULL,  -- e.g., "Sustainability"
    subtitle TEXT,        -- e.g., "Batwa Farms at Matanda, Uganda"
    description TEXT,
    image TEXT,           -- Image path
    link TEXT,            -- Link to goal page (e.g., "goalone.html")
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_mission_goal_cards_sort ON mission_goal_cards(sort_order);

-- Enable RLS
ALTER TABLE mission_goal_cards ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access on mission_goal_cards"
    ON mission_goal_cards FOR SELECT
    USING (true);

-- Public write access
CREATE POLICY "Allow public write access on mission_goal_cards"
    ON mission_goal_cards FOR ALL
    USING (true)
    WITH CHECK (true);


-- =====================================================
-- 4. MISSION SETTINGS TABLE
-- Stores settings like the breaker image
-- =====================================================
CREATE TABLE IF NOT EXISTS mission_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    breaker_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mission_settings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access on mission_settings"
    ON mission_settings FOR SELECT
    USING (true);

-- Public write access
CREATE POLICY "Allow public write access on mission_settings"
    ON mission_settings FOR ALL
    USING (true)
    WITH CHECK (true);


-- =====================================================
-- 5. GOAL PAGES TABLE
-- Stores content for individual goal pages
-- =====================================================
CREATE TABLE IF NOT EXISTS goal_pages (
    id TEXT PRIMARY KEY,
    label TEXT,              -- e.g., "Goal One:"
    title TEXT NOT NULL,     -- e.g., "Batwa Farm at Matanda, Uganda"
    slug TEXT NOT NULL,      -- e.g., "goalone.html"
    hero_image TEXT,         -- Hero image path
    content TEXT,            -- Body content (paragraphs)
    funding JSONB,           -- Array of {label, amount} objects
    gallery JSONB,           -- Array of {src, alt} objects
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups and ordering
CREATE INDEX IF NOT EXISTS idx_goal_pages_slug ON goal_pages(slug);
CREATE INDEX IF NOT EXISTS idx_goal_pages_sort ON goal_pages(sort_order);

-- Enable RLS
ALTER TABLE goal_pages ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access on goal_pages"
    ON goal_pages FOR SELECT
    USING (true);

-- Public write access
CREATE POLICY "Allow public write access on goal_pages"
    ON goal_pages FOR ALL
    USING (true)
    WITH CHECK (true);


-- =====================================================
-- OPTIONAL: Insert default mission settings
-- =====================================================
INSERT INTO mission_settings (id, breaker_image)
VALUES ('main', 'images/mission-breaker.jpg')
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- OPTIONAL: Seed data for mission goal cards
-- Uncomment and run if you want to pre-populate
-- =====================================================
/*
INSERT INTO mission_goal_cards (id, label, title, subtitle, description, image, link, sort_order) VALUES
('goal-1', 'Goal One:', 'Sustainability', 'Batwa Farms at Matanda, Uganda', 'Support sustainable farming initiatives for the Batwa community.', 'images/batwa+visit+farm+ocf.jpg', 'goalone.html', 0),
('goal-2', 'Goal Two:', 'Porters', 'Bwindi Porter Associations', 'Support porter associations through sustainable projects.', 'images/porters-03-cropped-1180x437.jpg', 'goaltwo.html', 1),
('goal-3', 'Goal Three:', 'Health', 'Emergency Food & Medical Supplies', 'Provide emergency health and food support to communities.', 'images/food-health.jpg', 'goalthree.html', 2),
('goal-4', 'Goal Four:', 'Technology', 'Digital Education', 'Support technology and photography education for children.', 'images/img_20210917_083407_264.jpg', 'goalfour.html', 3),
('goal-5', 'Goal Five:', 'Fresh Water', 'Clean Drinking Water Access', 'Support access to clean drinking water for communities.', 'images/water.jpg', 'goalfive.html', 4),
('goal-6', 'Goal Six:', 'Education', 'K-12 and Higher Education', 'Support education for children in need.', 'images/unified+basketball+hhs2023.jpg', 'goalsix.html', 5),
('goal-7', 'Goal Seven:', 'Donor Requests', 'Dreams and Visions', 'Support donor-initiated charitable projects.', 'images/linda+mercyjpeg.jpg', 'goalseven.html', 6),
('goal-8', 'Goal Eight:', 'The Partners Nepal', 'Nepal Projects', 'Support projects in Nepal through TPN partnership.', 'images/tpn.jpg', 'goaleight.html', 7),
('goal-9', 'Goal Nine:', 'Women In Gorilla Conservation', 'Conservation Efforts', 'Support women in gorilla conservation efforts.', 'images/womeningorilla-3.jpg', 'goalnine.html', 8),
('goal-10', 'Goal Ten:', 'Base Camp for Veterans', 'Veterans Support', 'Support veterans through horsemanship programs.', 'images/img_8315.jpg', 'goalten.html', 9),
('goal-11', 'Goal Eleven:', 'Randy Helm Horsemanship', 'Mustang Training', 'Support mustang training and horsemanship education.', 'images/randyhelm.jpg', 'goaleleven.html', 10),
('goal-12', 'Goal Twelve:', 'High Asia Habitat Fund', 'Snow Leopard Conservation', 'Support snow leopard conservation in the Himalayas.', 'images/goal12.jpg', 'goaltwelve.html', 11)
ON CONFLICT (id) DO NOTHING;
*/


-- =====================================================
-- UPDATE TRIGGERS (optional - for updated_at)
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for each table
DROP TRIGGER IF EXISTS update_about_content_updated_at ON about_content;
CREATE TRIGGER update_about_content_updated_at
    BEFORE UPDATE ON about_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mission_statements_updated_at ON mission_statements;
CREATE TRIGGER update_mission_statements_updated_at
    BEFORE UPDATE ON mission_statements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mission_goal_cards_updated_at ON mission_goal_cards;
CREATE TRIGGER update_mission_goal_cards_updated_at
    BEFORE UPDATE ON mission_goal_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mission_settings_updated_at ON mission_settings;
CREATE TRIGGER update_mission_settings_updated_at
    BEFORE UPDATE ON mission_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goal_pages_updated_at ON goal_pages;
CREATE TRIGGER update_goal_pages_updated_at
    BEFORE UPDATE ON goal_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
