/**
 * Omotani Caring Foundation - Squarespace Site Scraper
 *
 * This agent scrapes the entire Squarespace website, extracting:
 * - All page content (text, headings, links)
 * - All images (downloading to local storage)
 * - Navigation structure
 * - Metadata
 *
 * Output is organized into a clean folder structure for easy migration.
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import slugify from 'slugify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'https://www.omotanicaringfoundation.com',
  outputDir: path.join(__dirname, '..', 'migrated-content'),
  imageDir: 'images',
  contentDir: 'content',
  dataDir: 'data',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  requestDelay: 500, // ms between requests to be polite
  maxRetries: 3,
};

// Known pages to scrape (we'll also discover more dynamically)
const KNOWN_PAGES = [
  '/',
  '/about',
  '/about-us',
  '/our-mission',
  '/projects',
  '/gallery',
  '/global-images',
  '/progress',
  '/news-updates',
  '/newsupdates',
  '/news',
  '/honor-and-memory',
  '/honor-memory',
  '/get-involved',
  '/contact',
  '/contact-us',
  '/make-a-donation',
  '/donate',
  // Project pages
  '/batwa-farm',
  '/batwa-farms',
  '/porters-at-bwindi',
  '/porters',
  '/health',
  '/technology',
  '/fresh-water',
  '/education',
  '/donor-requests',
  '/partners-nepal',
  '/the-partners-nepal',
  '/women-in-gorilla-conservation',
  '/base-camp-for-veterans',
  '/randy-helm-horsemanship',
  '/high-asia-habitat-fund',
  // Gallery pages
  '/gallery-1',
  '/gallery-2',
  '/gallery-3',
];

// State tracking
const state = {
  visitedUrls: new Set(),
  discoveredUrls: new Set(),
  downloadedImages: new Map(), // url -> local path
  failedUrls: [],
  pages: [],
  navigation: [],
  siteMetadata: {},
};

// Utility functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeUrl(url, base = CONFIG.baseUrl) {
  if (!url) return null;

  // Skip non-http links
  if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) {
    return null;
  }

  // Handle protocol-relative URLs (starting with //)
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }

  try {
    const parsed = new URL(url, base);
    // Only include same-domain URLs
    if (parsed.hostname === new URL(base).hostname) {
      // Remove trailing slash and hash
      return parsed.origin + parsed.pathname.replace(/\/$/, '');
    }
  } catch (e) {
    return null;
  }
  return null;
}

function getSlug(url) {
  const pathname = new URL(url, CONFIG.baseUrl).pathname;
  return pathname === '/' ? 'home' : slugify(pathname.replace(/^\//, '').replace(/\//g, '-'), { lower: true });
}

async function fetchWithRetry(url, options = {}, retries = CONFIG.maxRetries) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': CONFIG.userAgent,
          ...options.headers,
        },
      });

      if (response.ok) {
        return response;
      }

      if (response.status === 404) {
        return null;
      }

      console.log(`  Retry ${i + 1}/${retries} for ${url} (status: ${response.status})`);
    } catch (error) {
      console.log(`  Retry ${i + 1}/${retries} for ${url} (error: ${error.message})`);
    }

    await delay(CONFIG.requestDelay * (i + 1));
  }

  return null;
}

// Image handling
async function downloadImage(imageUrl) {
  // Handle protocol-relative URLs
  if (imageUrl.startsWith('//')) {
    imageUrl = 'https:' + imageUrl;
  }

  if (state.downloadedImages.has(imageUrl)) {
    return state.downloadedImages.get(imageUrl);
  }

  try {
    const response = await fetchWithRetry(imageUrl);
    if (!response) {
      console.log(`  ❌ Failed to download: ${imageUrl}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || '';

    // Determine file extension
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('gif')) ext = '.gif';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('svg')) ext = '.svg';

    // Create filename from URL
    const urlPath = new URL(imageUrl).pathname;
    let filename = path.basename(urlPath);

    // Handle Squarespace image URLs
    if (imageUrl.includes('squarespace-cdn.com') || imageUrl.includes('static1.squarespace.com')) {
      // Extract meaningful part of the URL
      const parts = urlPath.split('/').filter(p => p && !p.match(/^\d+$/));
      filename = parts.length > 0 ? parts[parts.length - 1] : `image-${Date.now()}`;
    }

    // Ensure extension
    if (!filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      filename += ext;
    }

    // Sanitize filename
    filename = slugify(filename.replace(/\.[^.]+$/, ''), { lower: true }) + ext;

    // Categorize images by type/page
    let category = 'general';
    if (imageUrl.includes('gallery')) category = 'gallery';
    else if (imageUrl.includes('project')) category = 'projects';
    else if (imageUrl.includes('logo')) category = 'branding';
    else if (imageUrl.includes('hero') || imageUrl.includes('banner')) category = 'heroes';

    const localDir = path.join(CONFIG.outputDir, CONFIG.imageDir, category);
    await fs.ensureDir(localDir);

    const localPath = path.join(localDir, filename);
    await fs.writeFile(localPath, Buffer.from(buffer));

    const relativePath = path.relative(CONFIG.outputDir, localPath).replace(/\\/g, '/');
    state.downloadedImages.set(imageUrl, relativePath);

    console.log(`  📷 Downloaded: ${filename}`);
    return relativePath;

  } catch (error) {
    console.log(`  ❌ Error downloading ${imageUrl}: ${error.message}`);
    return null;
  }
}

function extractImages($, pageUrl) {
  const images = [];

  // Regular img tags
  $('img').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
    const srcset = $img.attr('srcset') || $img.attr('data-srcset');
    const alt = $img.attr('alt') || '';

    if (src) {
      const fullUrl = normalizeUrl(src, pageUrl) || src;
      images.push({ url: fullUrl, alt, type: 'img' });
    }

    // Extract highest resolution from srcset
    if (srcset) {
      const sources = srcset.split(',').map(s => s.trim().split(' '));
      const highest = sources.reduce((max, [url, size]) => {
        const res = parseInt(size) || 0;
        return res > (max.res || 0) ? { url, res } : max;
      }, {});
      if (highest.url) {
        const fullUrl = normalizeUrl(highest.url, pageUrl) || highest.url;
        images.push({ url: fullUrl, alt, type: 'srcset' });
      }
    }
  });

  // Background images in style attributes
  $('[style*="background"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    if (match) {
      const fullUrl = normalizeUrl(match[1], pageUrl) || match[1];
      images.push({ url: fullUrl, alt: '', type: 'background' });
    }
  });

  // Squarespace specific image containers
  $('[data-image], [data-image-id]').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('data-image') || $el.attr('data-src');
    if (src) {
      const fullUrl = normalizeUrl(src, pageUrl) || src;
      images.push({ url: fullUrl, alt: '', type: 'squarespace-data' });
    }
  });

  // Squarespace gallery images
  $('.gallery-item img, .sqs-gallery-image img, [data-type="image"] img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src) {
      const fullUrl = normalizeUrl(src, pageUrl) || src;
      images.push({ url: fullUrl, alt: $(el).attr('alt') || '', type: 'gallery' });
    }
  });

  // Picture source elements
  $('picture source').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const url = srcset.split(',')[0].split(' ')[0];
      const fullUrl = normalizeUrl(url, pageUrl) || url;
      images.push({ url: fullUrl, alt: '', type: 'picture-source' });
    }
  });

  // Deduplicate
  const unique = [...new Map(images.map(img => [img.url, img])).values()];
  return unique.filter(img => img.url && !img.url.startsWith('data:'));
}

function extractContent($, url) {
  const slug = getSlug(url);

  // Extract metadata
  const metadata = {
    title: $('title').text().trim() || $('h1').first().text().trim(),
    description: $('meta[name="description"]').attr('content') || '',
    ogTitle: $('meta[property="og:title"]').attr('content') || '',
    ogDescription: $('meta[property="og:description"]').attr('content') || '',
    ogImage: $('meta[property="og:image"]').attr('content') || '',
  };

  // Extract navigation
  const navigation = [];
  $('nav a, .header-nav a, .main-nav a, [class*="navigation"] a').each((_, el) => {
    const $a = $(el);
    const href = normalizeUrl($a.attr('href'), url);
    const text = $a.text().trim();
    if (href && text && !navigation.some(n => n.href === href)) {
      navigation.push({ text, href });
    }
  });

  // Extract main content sections
  const sections = [];

  // Try various content selectors
  const contentSelectors = [
    'main',
    '[role="main"]',
    '.main-content',
    '.page-content',
    '.sqs-layout',
    '#page',
    'article',
    '.content-wrapper',
  ];

  let $main = null;
  for (const selector of contentSelectors) {
    if ($(selector).length) {
      $main = $(selector).first();
      break;
    }
  }

  if (!$main) {
    $main = $('body');
  }

  // Extract headings and their content
  $main.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $heading = $(el);
    const level = parseInt(el.tagName[1]);
    const text = $heading.text().trim();

    if (text) {
      sections.push({
        type: 'heading',
        level,
        text,
      });
    }
  });

  // Extract paragraphs
  $main.find('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) {
      sections.push({
        type: 'paragraph',
        text,
        html: $(el).html(),
      });
    }
  });

  // Extract lists
  $main.find('ul, ol').each((_, el) => {
    const $list = $(el);
    const items = [];
    $list.find('li').each((_, li) => {
      const text = $(li).text().trim();
      if (text) items.push(text);
    });
    if (items.length) {
      sections.push({
        type: $list.is('ol') ? 'ordered-list' : 'unordered-list',
        items,
      });
    }
  });

  // Extract quotes/blockquotes
  $main.find('blockquote, .quote, [class*="quote"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      sections.push({
        type: 'quote',
        text,
      });
    }
  });

  // Extract links (for discovery and reference)
  const links = [];
  $main.find('a').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href');
    const text = $a.text().trim();

    if (href && text) {
      const normalized = normalizeUrl(href, url);
      if (normalized) {
        state.discoveredUrls.add(normalized);
      }
      links.push({
        text,
        href: normalized || href,
        isInternal: !!normalized,
      });
    }
  });

  // Extract any data blocks (Squarespace often stores JSON in scripts)
  const dataBlocks = [];
  $('script:not([src])').each((_, el) => {
    const content = $(el).html() || '';
    if (content.includes('Static.SQUARESPACE_CONTEXT') || content.includes('window.top.collection')) {
      dataBlocks.push(content);
    }
  });

  // Extract gallery items specifically (with limit to prevent memory issues)
  const galleryItems = [];
  const galleryElements = $('.gallery-item, .sqs-gallery-design-grid-slide, [data-type="image"]');
  const maxGalleryItems = 500; // Limit to prevent memory issues with huge galleries

  galleryElements.slice(0, maxGalleryItems).each((_, el) => {
    try {
      const $item = $(el);
      const $img = $item.find('img');
      const $caption = $item.find('.gallery-caption, figcaption, .image-caption');

      galleryItems.push({
        src: $img.attr('src') || $img.attr('data-src'),
        alt: $img.attr('alt') || '',
        caption: $caption.text().trim(),
      });
    } catch (e) {
      // Skip problematic gallery items
    }
  });

  if (galleryElements.length > maxGalleryItems) {
    console.log(`  ⚠️  Gallery limited to ${maxGalleryItems} items (total: ${galleryElements.length})`);
  }

  // Extract full text content (cleaned) - with protection against stack overflow
  let fullText = '';
  try {
    // Use a safer approach to extract text - limit to direct text nodes
    fullText = $main.text().substring(0, 50000).replace(/\s+/g, ' ').trim();
  } catch (e) {
    // If text extraction fails (e.g., stack overflow), use section text instead
    fullText = sections.map(s => s.text || (s.items ? s.items.join(' ') : '')).join(' ');
    console.log(`  ⚠️  Text extraction limited due to complex DOM structure`);
  }

  // Get raw HTML with protection against stack overflow
  let rawHtml = '';
  try {
    rawHtml = $main.html() || '';
  } catch (e) {
    rawHtml = '<!-- HTML extraction skipped due to complex DOM structure -->';
    console.log(`  ⚠️  HTML extraction limited due to complex DOM structure`);
  }

  return {
    slug,
    url,
    metadata,
    navigation,
    sections,
    links,
    galleryItems,
    dataBlocks,
    fullText,
    rawHtml,
  };
}

async function scrapePage(url) {
  if (state.visitedUrls.has(url)) {
    return null;
  }

  state.visitedUrls.add(url);
  console.log(`\n📄 Scraping: ${url}`);

  const response = await fetchWithRetry(url);
  if (!response) {
    console.log(`  ⚠️  Page not found or failed: ${url}`);
    state.failedUrls.push(url);
    return null;
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract content with error handling
  let content;
  try {
    content = extractContent($, url);
    console.log(`  ✅ Found ${content.sections.length} content sections`);
  } catch (e) {
    console.log(`  ⚠️  Content extraction failed: ${e.message}`);
    // Create minimal content object
    content = {
      slug: getSlug(url),
      url,
      metadata: {
        title: $('title').text().trim() || url,
        description: '',
      },
      navigation: [],
      sections: [],
      links: [],
      galleryItems: [],
      dataBlocks: [],
      fullText: '',
      rawHtml: '',
    };
  }

  // Extract and download images
  const images = extractImages($, url);
  console.log(`  🖼️  Found ${images.length} images`);

  const downloadedImages = [];
  for (const img of images) {
    await delay(100); // Small delay between image downloads
    const localPath = await downloadImage(img.url);
    if (localPath) {
      downloadedImages.push({
        original: img.url,
        local: localPath,
        alt: img.alt,
        type: img.type,
      });
    }
  }

  content.images = downloadedImages;

  // Discover new URLs from this page
  const newUrls = [...state.discoveredUrls].filter(u => !state.visitedUrls.has(u));
  console.log(`  🔗 Discovered ${newUrls.length} new URLs`);

  return content;
}

async function buildSiteNavigation() {
  console.log('\n📊 Building site navigation structure...');

  // Use the first page's navigation as the main nav
  if (state.pages.length > 0 && state.pages[0].navigation.length > 0) {
    state.navigation = state.pages[0].navigation;
  }

  // Build a site map from all discovered pages
  const siteMap = state.pages.map(page => ({
    title: page.metadata.title,
    url: page.url,
    slug: page.slug,
    hasImages: page.images.length > 0,
    imageCount: page.images.length,
    contentSections: page.sections.length,
  }));

  return siteMap;
}

async function saveResults() {
  console.log('\n💾 Saving results...');

  const dataDir = path.join(CONFIG.outputDir, CONFIG.dataDir);
  const contentDir = path.join(CONFIG.outputDir, CONFIG.contentDir);

  await fs.ensureDir(dataDir);
  await fs.ensureDir(contentDir);

  // Save site-wide data
  await fs.writeJson(
    path.join(dataDir, 'site-metadata.json'),
    {
      scrapedAt: new Date().toISOString(),
      baseUrl: CONFIG.baseUrl,
      totalPages: state.pages.length,
      totalImages: state.downloadedImages.size,
      failedUrls: state.failedUrls,
      navigation: state.navigation,
    },
    { spaces: 2 }
  );

  // Save site map
  const siteMap = await buildSiteNavigation();
  await fs.writeJson(
    path.join(dataDir, 'sitemap.json'),
    siteMap,
    { spaces: 2 }
  );

  // Save all pages data
  await fs.writeJson(
    path.join(dataDir, 'all-pages.json'),
    state.pages,
    { spaces: 2 }
  );

  // Save individual page content as markdown-ready files
  for (const page of state.pages) {
    const pageDir = path.join(contentDir, page.slug);
    await fs.ensureDir(pageDir);

    // Save structured JSON
    await fs.writeJson(
      path.join(pageDir, 'content.json'),
      {
        metadata: page.metadata,
        sections: page.sections,
        images: page.images,
        galleryItems: page.galleryItems,
        links: page.links,
      },
      { spaces: 2 }
    );

    // Save as markdown for easy reading
    let markdown = `# ${page.metadata.title}\n\n`;
    markdown += `> ${page.metadata.description}\n\n`;
    markdown += `---\n\n`;

    for (const section of page.sections) {
      if (section.type === 'heading') {
        markdown += `${'#'.repeat(section.level)} ${section.text}\n\n`;
      } else if (section.type === 'paragraph') {
        markdown += `${section.text}\n\n`;
      } else if (section.type === 'quote') {
        markdown += `> ${section.text}\n\n`;
      } else if (section.type === 'unordered-list') {
        section.items.forEach(item => {
          markdown += `- ${item}\n`;
        });
        markdown += '\n';
      } else if (section.type === 'ordered-list') {
        section.items.forEach((item, i) => {
          markdown += `${i + 1}. ${item}\n`;
        });
        markdown += '\n';
      }
    }

    // Add images section
    if (page.images.length > 0) {
      markdown += `\n## Images\n\n`;
      for (const img of page.images) {
        markdown += `![${img.alt || 'Image'}](../${img.local})\n`;
        if (img.alt) markdown += `*${img.alt}*\n`;
        markdown += '\n';
      }
    }

    await fs.writeFile(path.join(pageDir, 'content.md'), markdown);

    // Save raw HTML
    if (page.rawHtml) {
      await fs.writeFile(path.join(pageDir, 'raw.html'), page.rawHtml);
    }
  }

  // Save image manifest
  const imageManifest = [...state.downloadedImages.entries()].map(([original, local]) => ({
    original,
    local,
  }));
  await fs.writeJson(
    path.join(dataDir, 'image-manifest.json'),
    imageManifest,
    { spaces: 2 }
  );

  console.log(`\n✅ Saved ${state.pages.length} pages to ${CONFIG.outputDir}`);
  console.log(`📷 Downloaded ${state.downloadedImages.size} images`);
}

async function generateReport() {
  const report = `
╔══════════════════════════════════════════════════════════════════╗
║        OMOTANI CARING FOUNDATION - SITE MIGRATION REPORT         ║
╚══════════════════════════════════════════════════════════════════╝

📅 Scraped: ${new Date().toISOString()}
🌐 Source: ${CONFIG.baseUrl}

📊 STATISTICS
─────────────────────────────────────────
  Pages scraped:     ${state.pages.length}
  Images downloaded: ${state.downloadedImages.size}
  Failed URLs:       ${state.failedUrls.length}

📁 OUTPUT STRUCTURE
─────────────────────────────────────────
  ${CONFIG.outputDir}/
  ├── ${CONFIG.dataDir}/
  │   ├── site-metadata.json    (site-wide metadata)
  │   ├── sitemap.json          (all pages summary)
  │   ├── all-pages.json        (complete page data)
  │   └── image-manifest.json   (image URL mappings)
  ├── ${CONFIG.contentDir}/
  │   └── [page-slug]/
  │       ├── content.json      (structured content)
  │       ├── content.md        (markdown version)
  │       └── raw.html          (original HTML)
  └── ${CONFIG.imageDir}/
      ├── gallery/              (gallery images)
      ├── heroes/               (hero/banner images)
      ├── projects/             (project images)
      ├── branding/             (logos, icons)
      └── general/              (other images)

📄 PAGES SCRAPED
─────────────────────────────────────────
${state.pages.map(p => `  ✓ ${p.slug.padEnd(30)} (${p.images.length} images)`).join('\n')}

${state.failedUrls.length > 0 ? `
⚠️  FAILED URLS
─────────────────────────────────────────
${state.failedUrls.map(u => `  ✗ ${u}`).join('\n')}
` : ''}

🎉 Migration data ready for use!
`;

  console.log(report);

  // Save report to file
  await fs.writeFile(
    path.join(CONFIG.outputDir, 'MIGRATION-REPORT.txt'),
    report
  );
}

// Main execution
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║     OMOTANI CARING FOUNDATION - SQUARESPACE SITE SCRAPER         ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Setup directories
  await fs.ensureDir(CONFIG.outputDir);
  await fs.ensureDir(path.join(CONFIG.outputDir, CONFIG.imageDir));
  await fs.ensureDir(path.join(CONFIG.outputDir, CONFIG.contentDir));
  await fs.ensureDir(path.join(CONFIG.outputDir, CONFIG.dataDir));

  console.log(`📁 Output directory: ${CONFIG.outputDir}`);
  console.log(`🌐 Scraping: ${CONFIG.baseUrl}\n`);

  // Add known pages to queue
  KNOWN_PAGES.forEach(page => {
    state.discoveredUrls.add(CONFIG.baseUrl + page);
  });

  // Process all URLs - single pass through discovered URLs
  let processedCount = 0;
  const urlsToProcess = new Set([...state.discoveredUrls]);

  while (urlsToProcess.size > 0) {
    // Get next URL to process
    const url = urlsToProcess.values().next().value;
    urlsToProcess.delete(url);

    // Skip if already visited
    if (state.visitedUrls.has(url)) {
      continue;
    }

    await delay(CONFIG.requestDelay);
    const content = await scrapePage(url);

    if (content) {
      state.pages.push(content);
      processedCount++;

      // Add any newly discovered URLs to our queue
      for (const newUrl of state.discoveredUrls) {
        if (!state.visitedUrls.has(newUrl) && !urlsToProcess.has(newUrl)) {
          urlsToProcess.add(newUrl);
        }
      }
    }
  }

  if (processedCount === 0) {
    console.log('\n⚠️  No pages were successfully scraped. Check network connection.');
    return;
  }

  // Save everything
  await saveResults();

  // Generate report
  await generateReport();
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Usage: node scraper.js [options]

Options:
  --help          Show this help message
  --images-only   Only download images (skip content extraction)
  --content-only  Only extract content (skip image downloads)
`);
  process.exit(0);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
