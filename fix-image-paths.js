const fs = require('fs');
const path = require('path');

// Read the news posts
const newsPath = path.join(__dirname, 'site', 'data', 'news-posts.json');
const newsData = JSON.parse(fs.readFileSync(newsPath, 'utf-8'));

// Update image paths to use news/ subfolder
newsData.posts.forEach(post => {
  if (post.image && post.image.startsWith('images/')) {
    // Change from images/filename.jpg to images/news/filename.jpg
    post.image = post.image.replace('images/', 'images/news/');
  }
});

// Save updated file
fs.writeFileSync(newsPath, JSON.stringify(newsData, null, 2));
console.log('Updated image paths in news-posts.json');

// Count posts with and without images
let withImages = 0;
let withoutImages = 0;
newsData.posts.forEach(post => {
  if (post.image && post.image.length > 0) {
    withImages++;
  } else {
    withoutImages++;
    console.log(`  Missing image: ${post.title}`);
  }
});

console.log(`\nPosts with images: ${withImages}`);
console.log(`Posts without images: ${withoutImages}`);
