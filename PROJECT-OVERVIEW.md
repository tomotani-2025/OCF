# Omotani CARING Foundation Website Migration

## Organization Summary

**Omotani CARING Foundation (OCF)** is a 501(c)(3) nonprofit charity (EIN: 85-2581703) founded by **Drs. Les and Barbara Omotani**, lifelong educators who personally fund over 90% of the foundation's activities. The organization supports charitable, educational, medical, conservation, scientific, and humanitarian purposes globally.

**Key Differentiator:** OCF does NOT actively solicit donations - the founders personally fund most projects.

---

## Current Website

| Attribute | Details |
|-----------|---------|
| **URL** | https://www.omotanicaringfoundation.com |
| **Platform** | Squarespace |
| **Focus Areas** | Uganda (Batwa community), Nepal (Himalayas), USA (Veterans) |

### Site Structure (11 Main Pages)

- Home
- About Us
- Our Mission
- Projects (12 goals/initiatives)
- Gallery
- Progress
- News + Updates (50+ blog posts)
- Honor and Memory
- Global Images
- Contact Us / Get Involved
- Make a Donation

---

## Project Purpose

This project contains tools for **migrating the existing Squarespace website** to a new platform.

### Repository Structure

```
OmotaniCaringFoundation-Website/
├── scraper/                    # Content extraction tool
│   ├── scraper.js              # Main scraping script
│   ├── package.json            # Node.js dependencies
│   └── README.md               # Scraper documentation
│
├── migrated-content/           # Extracted website content
│   ├── data/
│   │   ├── site-metadata.json  # Scrape statistics
│   │   ├── sitemap.json        # All pages summary
│   │   ├── all-pages.json      # Complete page data
│   │   └── image-manifest.json # Image URL mappings
│   │
│   └── images/
│       └── general/            # Downloaded images
│
└── PROJECT-OVERVIEW.md         # This file
```

---

## Scraper Results

Last run: December 9, 2025

| Metric | Count |
|--------|-------|
| **Pages Scraped** | 88 |
| **Images Downloaded** | 2,974 |
| **Failed URLs** | 25 (mostly alternate URL patterns) |
| **News/Blog Posts** | 50+ |
| **Gallery Pages** | 6 |

### Running the Scraper

```bash
cd scraper
npm install
npm run scrape
```

Options:
- `npm run scrape` - Full scrape (pages + images)
- `npm run scrape:images` - Images only
- `npm run scrape:content` - Content only (no images)

---

## Foundation Projects (12 Goals)

| # | Project | Location | Focus |
|---|---------|----------|-------|
| 1 | Batwa Farm at Matanda | Uganda | Agricultural food independence for Batwa people |
| 2 | Porters at Bwindi | Uganda | Support for mountain porters |
| 3 | Health | Global | Healthcare initiatives |
| 4 | Technology | Global | Technology access |
| 5 | Fresh Water | Global | Clean water projects |
| 6 | Education | Global | Educational programs |
| 7 | Donor Requests | Various | Donor-directed initiatives |
| 8 | The Partners Nepal | Nepal | Himalayan community support |
| 9 | Women in Gorilla Conservation | Uganda | Empowering women in conservation |
| 10 | Base Camp for Veterans | USA | Veteran support programs |
| 11 | Randy Helm Horsemanship | USA | Therapeutic horsemanship |
| 12 | High Asia Habitat Fund | Himalayas | High-altitude conservation |

---

## Leadership & Advisory Team

### Founders/Trustees
- **Dr. Les Omotani** - Co-founder, Trustee
- **Dr. Barbara Omotani** - Co-founder, Trustee

### Advisors
- **Paul Kirui** (Kenya) - Senior Advisor, Safari guide, Bwindi children advocate
- **Koen Van Rompay, D.V.M., Ph.D.** (USA) - UC Davis researcher, Sahaya International founder
- **Brad Josephs** (USA/International) - Wildlife photographer, bear/snow leopard conservation
- **Ang Rita Sherpa** (Nepal) - Chairman of The Partners Nepal since 2012

---

## Content Inventory

### Main Pages
| Page | Images | Content Sections |
|------|--------|------------------|
| Home | 11 | 7 |
| About Us | 11 | 26 |
| Our Mission | 27 | 108 |
| Projects | 25 | 14 |
| Gallery | 7 | 4 |
| Progress | 1 | 21 |
| News + Updates | 41 | 20 |
| Honor and Memory | 1 | 18 |
| Get Involved | 5 | 11 |
| Make a Donation | 4 | 15 |

### Gallery Pages (Large Image Collections)
| Page | Images |
|------|--------|
| Gallery 1 | 1,001 |
| Gallery 2 | 283 |
| Gallery 3 | 279 |
| Global Images 1 | 412 |
| Global Images 2 | 149 |
| Global Images 3 | 43 |

---

## Tech Stack

### Scraper Dependencies
- **cheerio** - HTML parsing and DOM manipulation
- **node-fetch** - HTTP requests
- **fs-extra** - Enhanced file system operations
- **slugify** - URL slug generation
- **sharp** - Image processing and optimization

---

## Migration Checklist

### Phase 1: Content Extraction (Complete)
- [x] Scrape all pages
- [x] Download all images
- [x] Extract page metadata
- [x] Capture navigation structure
- [x] Export content as JSON/Markdown

### Phase 2: Content Organization
- [ ] Review and categorize images
- [ ] Clean up extracted text content
- [ ] Map old URLs to new structure
- [ ] Identify missing content

### Phase 3: New Site Development
- [ ] Select new platform/framework
- [ ] Design new templates
- [ ] Implement responsive layouts
- [ ] Set up donation integration
- [ ] Configure contact forms

### Phase 4: Launch
- [ ] Migrate content to new platform
- [ ] Set up URL redirects
- [ ] Test all pages and forms
- [ ] DNS cutover
- [ ] Post-launch monitoring

---

## Design Notes

Current site characteristics:
- Clean, minimal design with white/light backgrounds
- Professional photography of charitable work
- OCF circular logo emblem in header
- Grid-based, responsive layout
- Social sharing integration (Facebook, Pinterest, Twitter, LinkedIn)
- Mother Teresa inspirational quote featured
- Emphasis on transparency ("95% personally funded")

---

## Contact

- **Website:** https://www.omotanicaringfoundation.com
- **Organization Type:** 501(c)(3) USA Charity
- **EIN:** 85-2581703
