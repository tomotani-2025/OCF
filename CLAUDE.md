# Omotani Caring Foundation Website

## Architecture

- **Hosting**: Netlify (static site + serverless functions)
- **Database**: Supabase PostgreSQL
- **Image/Media Storage**: Supabase Storage (NOT GitHub)
- **Auth**: Supabase Auth

## Rules

1. **Images and media go to Supabase Storage** - never commit images to GitHub
2. GitHub is for code only
3. All uploads use Supabase Storage API

## Supabase Storage Buckets

- `images` - All site images
- `documents` - PDFs and documents

## Environment Variables (Netlify)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` - Required for storage uploads
