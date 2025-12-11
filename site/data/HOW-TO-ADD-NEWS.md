# How to Add News Posts

Adding a new news post is simple! Just edit the `news-posts.json` file in this folder.

## Quick Steps

1. Open `site/data/news-posts.json`
2. Add a new entry at the **top** of the `"posts"` array (so newest posts appear first)
3. Save the file
4. That's it! The website will automatically display your new post.

## Post Template

Copy this template and fill in your details:

```json
{
  "id": "unique-id-here",
  "title": "Your Post Title",
  "date": "2025-03-15",
  "year": 2025,
  "category": "Batwa",
  "author": "Les Omotani",
  "image": "images/your-image.jpg",
  "imageAlt": "Description of the image",
  "summary": "A brief 1-2 sentence summary that appears on the card.",
  "content": "Full content (can be the same as summary for now)"
}
```

## Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | A unique identifier (use lowercase, hyphens instead of spaces) |
| `title` | Yes | The headline of your news post |
| `date` | Yes | Date in YYYY-MM-DD format (e.g., "2025-03-15") |
| `year` | Yes | Just the year number (e.g., 2025) - used for reference |
| `category` | Yes | One of: `Batwa`, `Bwindi`, `Nepal`, `Base Camp For Veterans` |
| `author` | Yes | Author name (e.g., "Les Omotani") |
| `image` | Yes | Path to the image (relative to site folder) |
| `imageAlt` | Yes | Description of image for accessibility |
| `summary` | Yes | Brief summary shown on the news card (2-3 sentences max) |
| `content` | Yes | Full content (for future detail pages) |

## Categories

The following categories are available for filtering:

- **Batwa** - Posts about Batwa Farm and related projects in Uganda
- **Bwindi** - Posts about Bwindi region, gorilla conservation, and girls projects
- **Nepal** - Posts about The Partners Nepal, Hillary Memorial, and Nepal projects
- **Base Camp For Veterans** - Posts about veteran programs and horsemanship

## Example: Adding a New Post

**Before** (existing file):
```json
{
  "posts": [
    {
      "id": "border-fencing-2025",
      "title": "Border Fencing for Sir Edmund Hillary Memorial...",
      ...
    }
  ]
}
```

**After** (with new post added at top):
```json
{
  "posts": [
    {
      "id": "new-project-march-2025",
      "title": "Exciting New Project Launch!",
      "date": "2025-03-20",
      "year": 2025,
      "category": "Batwa",
      "author": "Les Omotani",
      "image": "images/new-project.jpg",
      "imageAlt": "Team at project launch",
      "summary": "We're thrilled to announce our latest initiative at the Batwa Farm...",
      "content": "We're thrilled to announce our latest initiative at the Batwa Farm..."
    },
    {
      "id": "border-fencing-2025",
      "title": "Border Fencing for Sir Edmund Hillary Memorial...",
      ...
    }
  ]
}
```

## Adding Images

1. Add your image to the `site/images/` folder
2. Use the path `images/your-image-name.jpg` in the JSON
3. Recommended: Use descriptive filenames with lowercase and hyphens
4. Optimal image size: 620x348px (16:9 ratio) or similar - images will be cropped to fit

## Tips

- Keep summaries under 150 characters for best display on cards
- Use clear, descriptive titles
- Always add new posts at the TOP of the array
- Make sure the JSON is valid (no trailing commas, proper quotes)
- Test locally before deploying if possible
- Cards display 6 posts per page with pagination

## Troubleshooting

**Posts not showing?**
- Check for JSON syntax errors (missing commas, quotes, brackets)
- Verify the image path is correct
- Make sure category matches exactly one of the four options

**Image not displaying?**
- Verify the file exists in `site/images/`
- Check the filename matches exactly (case-sensitive)
- Ensure the path starts with `images/` (no leading slash)

**Filtering not working?**
- Category must be exactly one of: `Batwa`, `Bwindi`, `Nepal`, `Base Camp For Veterans`
- Category is case-sensitive
