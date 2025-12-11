const fs = require('fs');
const path = require('path');

// Read the XML file
const xmlContent = fs.readFileSync(
  path.join(__dirname, 'Squarespace-Wordpress-Export-12-11-2025.xml'),
  'utf-8'
);

// Helper function to extract content between tags
function extractTagContent(xml, tagName, startIndex = 0) {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const cdataOpenTag = `<${tagName}><![CDATA[`;
  const cdataCloseTag = `]]></${tagName}>`;

  let start = xml.indexOf(openTag, startIndex);
  if (start === -1) return { content: null, endIndex: -1 };

  // Check if it's CDATA
  if (xml.substring(start, start + cdataOpenTag.length) === cdataOpenTag) {
    const contentStart = start + cdataOpenTag.length;
    const end = xml.indexOf(cdataCloseTag, contentStart);
    if (end === -1) return { content: null, endIndex: -1 };
    return {
      content: xml.substring(contentStart, end),
      endIndex: end + cdataCloseTag.length
    };
  }

  const contentStart = start + openTag.length;
  const end = xml.indexOf(closeTag, contentStart);
  if (end === -1) return { content: null, endIndex: -1 };

  let content = xml.substring(contentStart, end);
  // Handle CDATA within the content
  if (content.startsWith('<![CDATA[') && content.endsWith(']]>')) {
    content = content.substring(9, content.length - 3);
  }

  return {
    content: content,
    endIndex: end + closeTag.length
  };
}

// Find all items
function findAllItems(xml) {
  const items = [];
  let currentIndex = 0;

  while (true) {
    const itemStart = xml.indexOf('<item>', currentIndex);
    if (itemStart === -1) break;

    const itemEnd = xml.indexOf('</item>', itemStart);
    if (itemEnd === -1) break;

    const itemContent = xml.substring(itemStart, itemEnd + 7);
    items.push(itemContent);
    currentIndex = itemEnd + 7;
  }

  return items;
}

// Parse a single item
function parseItem(itemXml) {
  const getContent = (tagName) => extractTagContent(itemXml, tagName).content;

  return {
    title: getContent('title'),
    link: getContent('link'),
    content: getContent('content:encoded'),
    excerpt: getContent('excerpt:encoded'),
    postName: getContent('wp:post_name'),
    postType: getContent('wp:post_type'),
    postId: getContent('wp:post_id'),
    status: getContent('wp:status'),
    pubDate: getContent('pubDate'),
    postDate: getContent('wp:post_date'),
    creator: getContent('dc:creator'),
    attachmentUrl: getContent('wp:attachment_url')
  };
}

// Clean HTML content and extract plain text
function cleanHtmlToText(html) {
  if (!html) return '';

  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Convert some tags to newlines
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

// Extract image URLs from HTML content
function extractImages(html) {
  if (!html) return [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]);
  }

  return images;
}

// Generate slug from title
function generateSlug(title, date) {
  if (!title) return 'untitled';
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
  return `${slug}-${year}`;
}

// Determine category based on content and title
function categorizePost(title, content, link) {
  const text = `${title || ''} ${content || ''} ${link || ''}`.toLowerCase();

  if (text.includes('batwa') || text.includes('matanda') || text.includes('kihihi')) {
    return 'Batwa';
  }
  if (text.includes('nepal') || text.includes('tpn') || text.includes('sherpa') || text.includes('hillary') || text.includes('himalay')) {
    return 'Nepal';
  }
  if (text.includes('veteran') || text.includes('base camp') || text.includes('basecamp') || text.includes('mustang') || text.includes('helm')) {
    return 'Base Camp For Veterans';
  }
  if (text.includes('bwindi') || text.includes('gorilla') || text.includes('uganda')) {
    return 'Bwindi';
  }

  return 'General';
}

// Main processing
console.log('Parsing XML export...');
const items = findAllItems(xmlContent);
console.log(`Found ${items.length} total items`);

// Filter for posts only (not pages or attachments)
const posts = items
  .map(parseItem)
  .filter(item => item.postType === 'post' && item.status === 'publish');

console.log(`Found ${posts.length} published posts`);

// Build attachment map for featured images
const attachments = items
  .map(parseItem)
  .filter(item => item.postType === 'attachment');

const attachmentMap = {};
attachments.forEach(att => {
  if (att.postId && att.attachmentUrl) {
    attachmentMap[att.postId] = att.attachmentUrl;
  }
});

// Convert posts to our format
const convertedPosts = posts.map(post => {
  const date = post.postDate || post.pubDate;
  const dateObj = new Date(date);
  const formattedDate = dateObj.toISOString().split('T')[0];
  const year = dateObj.getFullYear();

  const plainContent = cleanHtmlToText(post.content);
  const images = extractImages(post.content);

  // Get first paragraph as summary
  const paragraphs = plainContent.split('\n\n').filter(p => p.trim().length > 0);
  const summary = paragraphs[0] ? paragraphs[0].substring(0, 300) : '';

  // Try to find featured image
  let featuredImage = '';
  if (images.length > 0) {
    featuredImage = images[0];
  }

  const category = categorizePost(post.title, plainContent, post.link);

  return {
    id: generateSlug(post.title, date),
    title: post.title || 'Untitled',
    date: formattedDate,
    year: year,
    category: category,
    author: post.creator === 'lmo8337@gmail.com' ? 'Les Omotani' : 'Todd Omotani',
    image: featuredImage,
    imageAlt: post.title || 'Post image',
    summary: summary.trim() + (summary.length >= 300 ? '...' : ''),
    content: plainContent,
    originalLink: post.link,
    rawHtml: post.content // Keep original HTML for reference
  };
});

// Sort by date (newest first)
convertedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Output the results
console.log('\n--- Extracted Posts ---\n');
convertedPosts.forEach((post, i) => {
  console.log(`${i + 1}. ${post.title}`);
  console.log(`   Date: ${post.date} | Category: ${post.category}`);
  console.log(`   Link: ${post.originalLink}`);
  console.log(`   Summary: ${post.summary.substring(0, 100)}...`);
  console.log('');
});

// Save to JSON file
const outputPath = path.join(__dirname, 'extracted-posts.json');
fs.writeFileSync(outputPath, JSON.stringify({ posts: convertedPosts }, null, 2));
console.log(`\nSaved ${convertedPosts.length} posts to extracted-posts.json`);

// Also create a summary file
const summaryPath = path.join(__dirname, 'posts-summary.txt');
let summary = `Extracted ${convertedPosts.length} posts from Squarespace export\n\n`;
summary += `Categories:\n`;
const categories = {};
convertedPosts.forEach(p => {
  categories[p.category] = (categories[p.category] || 0) + 1;
});
Object.entries(categories).forEach(([cat, count]) => {
  summary += `  - ${cat}: ${count}\n`;
});
summary += `\nYears:\n`;
const years = {};
convertedPosts.forEach(p => {
  years[p.year] = (years[p.year] || 0) + 1;
});
Object.entries(years).sort((a, b) => b[0] - a[0]).forEach(([year, count]) => {
  summary += `  - ${year}: ${count}\n`;
});

fs.writeFileSync(summaryPath, summary);
console.log(`Saved summary to posts-summary.txt`);
