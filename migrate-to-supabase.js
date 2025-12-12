/**
 * Migration script to import existing data into Supabase
 *
 * Run this once to migrate your existing JSON data to Supabase.
 * Usage: node migrate-to-supabase.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://wafdatyvcgimpsetelyb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZmRhdHl2Y2dpbXBzZXRlbHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY2NjcsImV4cCI6MjA4MTA3MjY2N30.khU-SsaThjovP0H29DWHuxBraiYS0YWY2c8rTEEir4o';

async function supabaseInsert(table, data) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Insert failed: ${JSON.stringify(error)}`);
    }

    return response.json();
}

async function migratePosts() {
    console.log('\\n📝 Migrating posts...');

    const postsPath = path.join(__dirname, 'site', 'data', 'news-posts.json');

    if (!fs.existsSync(postsPath)) {
        console.log('  No posts file found, skipping...');
        return;
    }

    const data = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
    const posts = data.posts || [];

    console.log(`  Found ${posts.length} posts to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const post of posts) {
        try {
            // Transform to Supabase schema
            const dbPost = {
                id: post.id,
                title: post.title,
                date: post.date,
                year: post.year || new Date(post.date).getFullYear(),
                category: post.category,
                author: post.author || 'Les Omotani',
                image: post.image,
                image_alt: post.imageAlt,
                summary: post.summary,
                content: post.content,
                images: JSON.stringify(post.images || []),
                videos: JSON.stringify(post.videos || []),
                pdfs: JSON.stringify(post.pdfs || []),
                featured_video: post.featuredVideo ?
                    (typeof post.featuredVideo === 'string' ? post.featuredVideo : post.featuredVideo.url)
                    : null
            };

            await supabaseInsert('posts', dbPost);
            migrated++;
            process.stdout.write(`\\r  Migrated: ${migrated}/${posts.length}`);
        } catch (error) {
            errors++;
            console.error(`\\n  Error migrating post "${post.title}": ${error.message}`);
        }
    }

    console.log(`\\n  ✅ Posts migration complete: ${migrated} migrated, ${errors} errors`);
}

async function migrateGallery() {
    console.log('\\n🖼️  Migrating gallery...');

    const galleryPath = path.join(__dirname, 'site', 'data', 'gallery.json');

    if (!fs.existsSync(galleryPath)) {
        console.log('  No gallery file found, skipping...');
        return;
    }

    const data = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
    const images = data.images || [];

    console.log(`  Found ${images.length} gallery images to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const img of images) {
        try {
            const dbImage = {
                id: img.id || `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                src: img.src,
                alt: img.alt,
                caption: img.caption,
                category: img.category,
                sort_order: img.order || 0
            };

            await supabaseInsert('gallery_images', dbImage);
            migrated++;
            process.stdout.write(`\\r  Migrated: ${migrated}/${images.length}`);
        } catch (error) {
            errors++;
            console.error(`\\n  Error migrating image "${img.caption}": ${error.message}`);
        }
    }

    console.log(`\\n  ✅ Gallery migration complete: ${migrated} migrated, ${errors} errors`);
}

async function migrateProgress() {
    console.log('\\n📊 Migrating progress goals...');

    const progressPath = path.join(__dirname, 'site', 'data', 'progress.json');

    if (!fs.existsSync(progressPath)) {
        console.log('  No progress file found, skipping...');
        return;
    }

    const data = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    const goals = data.goals || [];

    console.log(`  Found ${goals.length} progress goals to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const goal of goals) {
        try {
            const dbGoal = {
                id: goal.id || `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: goal.title,
                link: goal.link,
                bars: JSON.stringify(goal.bars || []),
                sort_order: goal.order || 0
            };

            await supabaseInsert('progress_goals', dbGoal);
            migrated++;
            process.stdout.write(`\\r  Migrated: ${migrated}/${goals.length}`);
        } catch (error) {
            errors++;
            console.error(`\\n  Error migrating goal "${goal.title}": ${error.message}`);
        }
    }

    console.log(`\\n  ✅ Progress migration complete: ${migrated} migrated, ${errors} errors`);
}

async function main() {
    console.log('🚀 Starting Supabase Migration');
    console.log('================================');

    try {
        await migratePosts();
        await migrateGallery();
        await migrateProgress();

        console.log('\\n================================');
        console.log('✅ Migration complete!');
        console.log('\\nYour data is now in Supabase.');
        console.log('Posts will update instantly when you publish from the admin!');
    } catch (error) {
        console.error('\\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

main();
