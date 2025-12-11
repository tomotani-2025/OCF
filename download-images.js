const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Read the news posts
const newsData = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'site', 'data', 'news-posts.json'),
  'utf-8'
));

// Also read the extracted posts for all image URLs from rawHtml
const extractedData = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'extracted-posts.json'),
  'utf-8'
));

// Output directory
const outputDir = path.join(__dirname, 'site', 'images', 'news');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Extract all image URLs from HTML content
function extractAllImageUrls(html) {
  if (!html) return [];
  const imgRegex = /src=["']([^"']*squarespace-cdn\.com[^"']+)["']/gi;
  const urls = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

// Convert URL to local filename
function urlToFilename(url) {
  // Extract filename from Squarespace URL
  const match = url.match(/\/([^\/]+)\?format/);
  if (match) {
    let filename = decodeURIComponent(match[1])
      .toLowerCase()
      .replace(/\+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/%20/g, '-')
      .replace(/%27/g, '')
      .replace(/'/g, '')
      .replace(/[()]/g, '')
      .replace(/-+/g, '-');
    return filename;
  }

  // Fallback: use hash of URL
  const hash = url.split('/').pop().split('?')[0];
  return hash.toLowerCase();
}

// Download a single image
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(outputDir, filename);

    // Skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`  [SKIP] ${filename} (already exists)`);
      resolve({ url, filename, status: 'skipped' });
      return;
    }

    // Use https or http based on URL
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location, filename)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        console.log(`  [FAIL] ${filename} (HTTP ${response.statusCode})`);
        resolve({ url, filename, status: 'failed', code: response.statusCode });
        return;
      }

      const file = fs.createWriteStream(filepath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`  [OK] ${filename}`);
        resolve({ url, filename, status: 'downloaded' });
      });

      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete partial file
        reject(err);
      });
    });

    request.on('error', (err) => {
      console.log(`  [ERROR] ${filename}: ${err.message}`);
      resolve({ url, filename, status: 'error', message: err.message });
    });

    request.setTimeout(30000, () => {
      request.destroy();
      console.log(`  [TIMEOUT] ${filename}`);
      resolve({ url, filename, status: 'timeout' });
    });
  });
}

// Collect all unique image URLs
const allUrls = new Map();

// From main images in posts
newsData.posts.forEach(post => {
  if (post.originalImage && post.originalImage.includes('squarespace-cdn.com')) {
    const filename = urlToFilename(post.originalImage);
    allUrls.set(post.originalImage, filename);
  }
});

// From rawHtml in extracted posts (all gallery images)
extractedData.posts.forEach(post => {
  if (post.rawHtml) {
    const urls = extractAllImageUrls(post.rawHtml);
    urls.forEach(url => {
      const filename = urlToFilename(url);
      allUrls.set(url, filename);
    });
  }
});

console.log(`Found ${allUrls.size} unique images to download\n`);

// Download images with concurrency limit
async function downloadAll() {
  const entries = Array.from(allUrls.entries());
  const results = {
    downloaded: 0,
    skipped: 0,
    failed: 0,
    error: 0,
    timeout: 0
  };

  // Process in batches of 5 concurrent downloads
  const batchSize = 5;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    console.log(`\nBatch ${Math.floor(i/batchSize) + 1}/${Math.ceil(entries.length/batchSize)}:`);

    const promises = batch.map(([url, filename]) => downloadImage(url, filename));
    const batchResults = await Promise.all(promises);

    batchResults.forEach(r => {
      results[r.status] = (results[r.status] || 0) + 1;
    });

    // Small delay between batches to be respectful
    if (i + batchSize < entries.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n--- Download Summary ---');
  console.log(`Downloaded: ${results.downloaded}`);
  console.log(`Skipped (existing): ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Errors: ${results.error}`);
  console.log(`Timeouts: ${results.timeout}`);
  console.log(`\nImages saved to: ${outputDir}`);
}

downloadAll().catch(console.error);
