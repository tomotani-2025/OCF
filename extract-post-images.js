/**
 * Extract all images from Squarespace XML export and update news-posts.json
 *
 * This script:
 * 1. Parses the Squarespace WordPress XML export
 * 2. Finds all news/blog posts
 * 3. Extracts all images from each post's content
 * 4. Updates news-posts.json with an 'images' array for each post
 *
 * Run: node extract-post-images.js
 */

const fs = require('fs');
const path = require('path');

// File paths
const xmlPath = path.join(__dirname, 'Squarespace-Wordpress-Export-12-11-2025.xml');
const jsonPath = path.join(__dirname, 'site', 'data', 'news-posts.json');
const outputPath = path.join(__dirname, 'site', 'data', 'news-posts.json');

// Read the files
console.log('Reading files...');
const xmlContent = fs.readFileSync(xmlPath, 'utf8');
const postsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

/**
 * Extract Squarespace image URLs from HTML content
 */
function extractSquarespaceImages(html) {
    const images = [];

    // Match img tags with squarespace CDN URLs
    const imgRegex = /<img[^>]+src=["']([^"']*images\.squarespace-cdn\.com[^"']*?)["'][^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
        let url = match[0];

        // Extract the actual src URL
        const srcMatch = url.match(/src=["']([^"']+)["']/i);
        if (srcMatch) {
            let imgUrl = srcMatch[1];

            // Clean up the URL - get the original format
            imgUrl = imgUrl.split('?')[0]; // Remove query params

            // Skip if already in array
            if (!images.includes(imgUrl)) {
                images.push(imgUrl);
            }
        }
    }

    // Also check data-image attributes (Squarespace often uses these)
    const dataImgRegex = /data-image=["']([^"']*images\.squarespace-cdn\.com[^"']*?)["']/gi;
    while ((match = dataImgRegex.exec(html)) !== null) {
        let imgUrl = match[1].split('?')[0];
        if (!images.includes(imgUrl)) {
            images.push(imgUrl);
        }
    }

    return images;
}

/**
 * Find post content in XML by link/slug
 */
function findPostInXml(xmlContent, originalLink) {
    // The originalLink is like "/newsupdates/post-slug"
    const slug = originalLink.replace('/newsupdates/', '');

    // Try to find the item with this link
    const linkPattern = new RegExp(`<link>.*?${slug}.*?</link>`, 'i');
    const linkMatch = xmlContent.match(linkPattern);

    if (linkMatch) {
        // Find the surrounding <item> block
        const linkIndex = xmlContent.indexOf(linkMatch[0]);

        // Search backwards for <item>
        const itemStart = xmlContent.lastIndexOf('<item>', linkIndex);
        if (itemStart === -1) return null;

        // Search forwards for </item>
        const itemEnd = xmlContent.indexOf('</item>', linkIndex);
        if (itemEnd === -1) return null;

        return xmlContent.substring(itemStart, itemEnd + 7);
    }

    return null;
}

/**
 * Extract images for a specific post
 */
function getImagesForPost(xmlContent, post) {
    const images = [];

    // First, add the main image if it exists
    if (post.originalImage && post.originalImage.trim() !== '') {
        images.push({
            url: post.originalImage,
            alt: post.imageAlt || post.title,
            isMain: true
        });
    }

    // Try to find the post in XML and extract additional images
    if (post.originalLink) {
        const postXml = findPostInXml(xmlContent, post.originalLink);
        if (postXml) {
            const foundUrls = extractSquarespaceImages(postXml);

            // Add images that aren't the main image
            foundUrls.forEach(url => {
                // Normalize URLs for comparison
                const normalizedMain = post.originalImage ? post.originalImage.split('?')[0] : '';
                const normalizedFound = url.split('?')[0];

                if (normalizedFound !== normalizedMain && !images.find(img => img.url.split('?')[0] === normalizedFound)) {
                    images.push({
                        url: url,
                        alt: '',
                        isMain: false
                    });
                }
            });
        }
    }

    return images;
}

/**
 * Convert Squarespace URL to local path
 */
function getLocalImagePath(squarespaceUrl, isMainImage, existingLocalPath) {
    // If this is the main image and we have an existing local path, use it
    if (isMainImage && existingLocalPath && existingLocalPath.startsWith('images/news/')) {
        return existingLocalPath;
    }

    // Extract filename from Squarespace URL
    try {
        const url = new URL(squarespaceUrl);
        const pathParts = url.pathname.split('/');
        let filename = pathParts[pathParts.length - 1];

        // URL decode and clean up filename
        filename = decodeURIComponent(filename)
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/\+/g, '-');

        return `images/news/${filename}`;
    } catch (e) {
        return squarespaceUrl; // Fall back to original URL
    }
}

// Process each post
console.log(`Processing ${postsData.posts.length} posts...`);

let updatedCount = 0;
let totalImagesFound = 0;

postsData.posts.forEach((post, index) => {
    console.log(`\n[${index + 1}/${postsData.posts.length}] ${post.title.substring(0, 50)}...`);

    const images = getImagesForPost(xmlContent, post);

    if (images.length > 0) {
        // Convert to local paths where possible
        post.images = images.map((img, idx) => ({
            src: getLocalImagePath(img.url, img.isMain, post.image),
            alt: img.alt || post.title,
            originalUrl: img.url
        }));

        // If we only have the main image and it's already set, keep images array minimal
        if (post.images.length === 1 && post.images[0].src === post.image) {
            // Just update with the structured format
            post.images = [{
                src: post.image,
                alt: post.imageAlt || post.title
            }];
        }

        totalImagesFound += images.length;
        updatedCount++;
        console.log(`  Found ${images.length} image(s)`);
    } else {
        // Create images array from existing single image
        if (post.image && post.image.trim() !== '') {
            post.images = [{
                src: post.image,
                alt: post.imageAlt || post.title
            }];
        } else {
            post.images = [];
        }
        console.log(`  No additional images found`);
    }
});

// Write updated JSON
console.log('\nWriting updated news-posts.json...');
fs.writeFileSync(outputPath, JSON.stringify(postsData, null, 2));

console.log(`\nDone!`);
console.log(`- Updated ${updatedCount} posts`);
console.log(`- Total images found: ${totalImagesFound}`);
console.log(`- Output: ${outputPath}`);
