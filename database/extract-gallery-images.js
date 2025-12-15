const fs = require('fs');
const path = require('path');

// Album mappings
const albums = [
  { id: 1, file: 'site/global-images.html', name: 'Global Images' },
  { id: 2, file: 'site/gallery-2017-2024.html', name: 'Gallery 2017-2024' },
  { id: 3, file: 'site/gallery-2.html', name: 'Gallery 2' },
  { id: 4, file: 'site/gallery-3.html', name: 'Gallery 3' }
];

let sql = '-- Populate album_images table with existing gallery images\n';
sql += '-- Generated from HTML gallery pages\n\n';

albums.forEach(album => {
  const filePath = path.join(__dirname, '..', album.file);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const html = fs.readFileSync(filePath, 'utf8');

  // Extract all image src paths from gallery-item divs
  const regex = /<div class="gallery-item">\s*<img src="([^"]+)"/g;
  const images = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    images.push(match[1]);
  }

  sql += `-- ${album.name} (${images.length} images)\n`;

  images.forEach((imgPath, index) => {
    const filename = path.basename(imgPath);
    const escapedFilename = filename.replace(/'/g, "''");
    const escapedPath = imgPath.replace(/'/g, "''");

    sql += `INSERT INTO album_images (album_id, filename, file_path, alt_text, sort_order) VALUES (${album.id}, '${escapedFilename}', '${escapedPath}', 'Gallery image', ${index});\n`;
  });

  sql += '\n';
});

// Write to file
const outputPath = path.join(__dirname, 'populate-gallery-images.sql');
fs.writeFileSync(outputPath, sql);
console.log(`SQL file generated: ${outputPath}`);
console.log(sql);
