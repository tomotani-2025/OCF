/**
 * Reorganize Images by Page Source
 *
 * This script reads the all-pages.json data and reorganizes the downloaded
 * images into folders based on which page they were found on.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  migratedContentDir: path.join(__dirname, '..', 'migrated-content'),
  dataFile: 'data/all-pages.json',
  oldImageDir: 'images',
  newImageDir: 'images-by-page',
};

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           REORGANIZE IMAGES BY PAGE SOURCE                       ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Load the scraped data
  const dataPath = path.join(CONFIG.migratedContentDir, CONFIG.dataFile);

  if (!await fs.pathExists(dataPath)) {
    console.error(`❌ Data file not found: ${dataPath}`);
    console.error('   Please run the scraper first.');
    process.exit(1);
  }

  console.log('📖 Reading page data...');
  const pages = await fs.readJson(dataPath);
  console.log(`   Found ${pages.length} pages\n`);

  // Create the new image directory structure
  const newImageBase = path.join(CONFIG.migratedContentDir, CONFIG.newImageDir);
  await fs.ensureDir(newImageBase);

  // Track statistics
  const stats = {
    totalImages: 0,
    copiedImages: 0,
    missingImages: 0,
    sharedImages: new Map(), // Track images used on multiple pages
  };

  // Build a map of image -> pages it appears on
  const imageToPages = new Map();

  for (const page of pages) {
    if (!page.images || page.images.length === 0) continue;

    for (const img of page.images) {
      if (!img.local) continue;

      const existing = imageToPages.get(img.local) || [];
      existing.push(page.slug);
      imageToPages.set(img.local, existing);
    }
  }

  // Report on shared images
  console.log('📊 Analyzing image usage...');
  let sharedCount = 0;
  for (const [imgPath, pageSlugs] of imageToPages) {
    if (pageSlugs.length > 1) {
      sharedCount++;
      stats.sharedImages.set(imgPath, pageSlugs);
    }
  }
  console.log(`   ${imageToPages.size} unique images`);
  console.log(`   ${sharedCount} images shared across multiple pages\n`);

  // Process each page
  console.log('📁 Organizing images by page...\n');

  for (const page of pages) {
    if (!page.images || page.images.length === 0) continue;

    const pageSlug = page.slug;
    const pageImageDir = path.join(newImageBase, pageSlug);
    await fs.ensureDir(pageImageDir);

    console.log(`📄 ${pageSlug} (${page.images.length} images)`);

    for (const img of page.images) {
      if (!img.local) continue;

      stats.totalImages++;

      // Source path (existing location)
      const sourcePath = path.join(CONFIG.migratedContentDir, img.local);

      // Get just the filename
      const filename = path.basename(img.local);

      // Destination path (new location)
      const destPath = path.join(pageImageDir, filename);

      try {
        if (await fs.pathExists(sourcePath)) {
          // Copy (not move) so shared images exist in all relevant folders
          await fs.copy(sourcePath, destPath, { overwrite: false });
          stats.copiedImages++;
        } else {
          console.log(`   ⚠️  Missing: ${img.local}`);
          stats.missingImages++;
        }
      } catch (error) {
        if (error.code !== 'EEXIST') {
          console.log(`   ❌ Error copying ${filename}: ${error.message}`);
        }
      }
    }
  }

  // Create a manifest of shared images
  if (stats.sharedImages.size > 0) {
    const sharedManifest = {};
    for (const [imgPath, pageSlugs] of stats.sharedImages) {
      sharedManifest[path.basename(imgPath)] = pageSlugs;
    }

    await fs.writeJson(
      path.join(newImageBase, '_shared-images.json'),
      sharedManifest,
      { spaces: 2 }
    );
  }

  // Create an index of all pages and their images
  const pageIndex = pages
    .filter(p => p.images && p.images.length > 0)
    .map(p => ({
      slug: p.slug,
      url: p.url,
      title: p.metadata?.title || p.slug,
      imageCount: p.images.length,
      images: p.images.map(img => ({
        filename: path.basename(img.local || ''),
        alt: img.alt || '',
        original: img.original,
      })),
    }));

  await fs.writeJson(
    path.join(newImageBase, '_page-image-index.json'),
    pageIndex,
    { spaces: 2 }
  );

  // Print summary
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                        SUMMARY                                   ║
╚══════════════════════════════════════════════════════════════════╝

📊 Statistics:
   Total image references:  ${stats.totalImages}
   Images copied:           ${stats.copiedImages}
   Missing images:          ${stats.missingImages}
   Shared images:           ${stats.sharedImages.size}

📁 Output location:
   ${newImageBase}

📄 Generated files:
   _page-image-index.json  - Index of all pages and their images
   _shared-images.json     - Images used on multiple pages

✅ Images are now organized by the page they appeared on!
`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
