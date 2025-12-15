/**
 * Projects Page Dynamic Content Loader
 * Loads project tiles from Supabase goal_pages data
 */

(async function() {
    'use strict';

    // Wait for supabase client to be available
    if (typeof goalPagesAPI === 'undefined') {
        console.error('goalPagesAPI not available. Make sure supabase-client.js is loaded first.');
        return;
    }

    try {
        const pages = await goalPagesAPI.getAll();

        if (pages.length > 0) {
            const projectsGrid = document.querySelector('.projects-grid');
            if (projectsGrid) {
                projectsGrid.innerHTML = '';
                pages.forEach(page => {
                    const tile = createProjectTile(page);
                    projectsGrid.appendChild(tile);
                });
            }
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }

    function createProjectTile(page) {
        const link = document.createElement('a');
        link.href = page.slug || '#';
        link.className = 'project-tile reveal-on-scroll';

        // Background image
        const imageDiv = document.createElement('div');
        imageDiv.className = 'project-tile-image';
        imageDiv.style.backgroundImage = `url('${page.hero_image || ''}')`;
        link.appendChild(imageDiv);

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'project-tile-overlay';
        link.appendChild(overlay);

        // Content
        const content = document.createElement('div');
        content.className = 'project-tile-content';

        if (page.label) {
            const label = document.createElement('h3');
            label.className = 'goal-label';
            label.textContent = page.label;
            content.appendChild(label);
        }

        const title = document.createElement('h2');
        title.className = 'goal-title';
        title.textContent = page.title || '';
        content.appendChild(title);

        link.appendChild(content);
        return link;
    }
})();
