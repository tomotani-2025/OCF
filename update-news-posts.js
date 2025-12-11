const fs = require('fs');
const path = require('path');

// Read the extracted posts
const extractedData = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'extracted-posts.json'),
  'utf-8'
));

// Clean up HTML entities in text
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/&amp;nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Convert Squarespace image URL to a simpler filename
function extractImageFilename(url) {
  if (!url) return '';

  // Extract filename from Squarespace URL
  const match = url.match(/\/([^\/]+)\?format/);
  if (match) {
    let filename = decodeURIComponent(match[1])
      .toLowerCase()
      .replace(/\+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/%20/g, '-')
      .replace(/[()]/g, '')
      .replace(/-+/g, '-');
    return 'images/' + filename;
  }
  return '';
}

// Process the posts
const processedPosts = extractedData.posts.map(post => {
  // Clean up the title
  let title = cleanText(post.title);

  // Fix HTML entity issues in title
  title = title.replace(/&amp;nbsp;/g, ' ').replace(/&amp;/g, '&');

  // Clean up the content
  let content = post.content || '';
  content = content
    .replace(/\[caption[^\]]*\]/g, '')
    .replace(/\[\/caption\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Get a clean summary (first paragraph or first 300 chars)
  let summary = content.split('\n\n')[0] || '';
  if (summary.length > 300) {
    summary = summary.substring(0, 297) + '...';
  }

  // Process the image URL
  const imageUrl = post.image;
  const localImage = extractImageFilename(imageUrl);

  return {
    id: post.id,
    title: title,
    date: post.date,
    year: post.year,
    category: post.category,
    author: post.author,
    image: localImage || imageUrl, // Keep original URL if no local conversion
    imageAlt: title,
    summary: summary,
    content: content,
    // Keep original data for reference
    originalImage: imageUrl,
    originalLink: post.originalLink
  };
});

// Sort by date (newest first)
processedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Output the final JSON
const outputPath = path.join(__dirname, 'site', 'data', 'news-posts.json');
fs.writeFileSync(outputPath, JSON.stringify({ posts: processedPosts }, null, 2));
console.log(`Updated ${processedPosts.length} posts in news-posts.json`);

// Print summary of categories and years
console.log('\n--- Summary ---');
const categories = {};
const years = {};
processedPosts.forEach(p => {
  categories[p.category] = (categories[p.category] || 0) + 1;
  years[p.year] = (years[p.year] || 0) + 1;
});

console.log('\nCategories:');
Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});

console.log('\nYears:');
Object.entries(years).sort((a, b) => b[0] - a[0]).forEach(([year, count]) => {
  console.log(`  ${year}: ${count}`);
});

// Show first few posts
console.log('\n--- Latest Posts ---');
processedPosts.slice(0, 5).forEach((post, i) => {
  console.log(`\n${i + 1}. ${post.title}`);
  console.log(`   Date: ${post.date}`);
  console.log(`   Category: ${post.category}`);
  console.log(`   Image: ${post.image.substring(0, 60)}...`);
});
