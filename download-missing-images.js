/**
 * Download missing images from Squarespace CDN
 *
 * This script:
 * 1. Reads news-posts.json
 * 2. Checks which images are missing locally
 * 3. Downloads them from the originalUrl
 *
 * Run: node download-missing-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// File paths
const jsonPath = path.join(__dirname, 'site', 'data', 'news-posts.json');
const imagesDir = path.join(__dirname, 'site', 'images', 'news');

// Ensure images directory exists
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Read posts
const postsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

/**
 * Download a file from URL
 */
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        // Skip if file already exists
        if (fs.existsSync(destPath)) {
            resolve({ status: 'exists', path: destPath });
            return;
        }

        const file = fs.createWriteStream(destPath);

        https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                fs.unlinkSync(destPath);
                downloadFile(response.headers.location, destPath)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve({ status: 'downloaded', path: destPath });
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
            }
            reject(err);
        });
    });
}

/**
 * Get local path for an image
 */
function getLocalPath(src) {
    if (src.startsWith('images/')) {
        return path.join(__dirname, 'site', src);
    }
    return null;
}

// Collect all unique images to download
const imagesToDownload = [];
const seen = new Set();

postsData.posts.forEach(post => {
    if (post.images && Array.isArray(post.images)) {
        post.images.forEach(img => {
            if (img.originalUrl && img.src && !seen.has(img.originalUrl)) {
                seen.add(img.originalUrl);
                const localPath = getLocalPath(img.src);
                if (localPath) {
                    imagesToDownload.push({
                        url: img.originalUrl,
                        localPath: localPath,
                        src: img.src
                    });
                }
            }
        });
    }
});

console.log(`Found ${imagesToDownload.length} unique images to check/download`);

// Download images sequentially to avoid overwhelming the server
async function downloadAll() {
    let downloaded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < imagesToDownload.length; i++) {
        const img = imagesToDownload[i];
        const progress = `[${i + 1}/${imagesToDownload.length}]`;

        try {
            const result = await downloadFile(img.url, img.localPath);
            if (result.status === 'downloaded') {
                console.log(`${progress} Downloaded: ${img.src}`);
                downloaded++;
            } else {
                console.log(`${progress} Exists: ${img.src}`);
                skipped++;
            }
        } catch (err) {
            console.log(`${progress} Failed: ${img.src} - ${err.message}`);
            failed++;
        }

        // Small delay to be nice to the server
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\nDone!`);
    console.log(`- Downloaded: ${downloaded}`);
    console.log(`- Already existed: ${skipped}`);
    console.log(`- Failed: ${failed}`);
}

downloadAll().catch(console.error);
