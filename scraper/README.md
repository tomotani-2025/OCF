# Omotani Caring Foundation - Site Scraper

This tool scrapes the existing Squarespace website and organizes all content for migration to the new site.

## Quick Start

```bash
cd scraper
npm install
npm run scrape
```

## What It Does

1. **Scrapes all pages** from the Squarespace site
2. **Downloads all images** (photos, galleries, backgrounds)
3. **Extracts content** (headings, paragraphs, quotes, lists)
4. **Organizes everything** into a clean folder structure

## Output Structure

After running, you'll find everything in `../migrated-content/`:

```
migrated-content/
├── data/
│   ├── site-metadata.json    # Site-wide info, nav structure
│   ├── sitemap.json          # All pages summary
│   ├── all-pages.json        # Complete scraped data
│   └── image-manifest.json   # Original → local image mapping
│
├── content/
│   └── [page-slug]/
│       ├── content.json      # Structured content (for code)
│       ├── content.md        # Markdown version (for reading)
│       └── raw.html          # Original HTML (reference)
│
├── images/
│   ├── gallery/              # Gallery photos
│   ├── heroes/               # Hero/banner images
│   ├── projects/             # Project-specific images
│   ├── branding/             # Logos, icons
│   └── general/              # Everything else
│
└── MIGRATION-REPORT.txt      # Summary of what was scraped
```

## Content JSON Format

Each page's `content.json` contains:

```json
{
  "metadata": {
    "title": "Page Title",
    "description": "Meta description",
    "ogImage": "Social share image URL"
  },
  "sections": [
    { "type": "heading", "level": 1, "text": "Main Heading" },
    { "type": "paragraph", "text": "Content..." },
    { "type": "quote", "text": "Inspirational quote..." },
    { "type": "unordered-list", "items": ["Item 1", "Item 2"] }
  ],
  "images": [
    {
      "original": "https://original-url.com/image.jpg",
      "local": "images/gallery/image.jpg",
      "alt": "Image description",
      "type": "gallery"
    }
  ],
  "galleryItems": [
    { "src": "...", "alt": "...", "caption": "..." }
  ],
  "links": [
    { "text": "Link text", "href": "/page", "isInternal": true }
  ]
}
```

## Options

```bash
# Full scrape (default)
npm run scrape

# Images only
npm run scrape:images

# Content only (no image downloads)
npm run scrape:content
```

## Configuration

Edit the `CONFIG` object in `scraper.js` to adjust:

- `requestDelay` - Time between requests (default: 500ms)
- `maxRetries` - Retry attempts for failed requests
- `userAgent` - Browser user agent string

## Adding More Pages

If you know of pages not being discovered, add them to the `KNOWN_PAGES` array in `scraper.js`.

## Notes

- The scraper is polite - it waits between requests
- Images are deduplicated automatically
- Squarespace-specific selectors are included for galleries
- The markdown files are human-readable summaries
