-- Create 'videos' storage bucket for MP4 video uploads
-- Run this in the Supabase SQL Editor

-- Create the videos storage bucket (public, 50MB max file size)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'videos',
    'videos',
    true,
    52428800,  -- 50MB
    ARRAY['video/mp4']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the videos bucket
CREATE POLICY "Public read access for videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- Allow authenticated uploads to the videos bucket
CREATE POLICY "Service role upload access for videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos');

-- Allow service role to update/overwrite videos
CREATE POLICY "Service role update access for videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'videos');
