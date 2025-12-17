/**
 * Goal Page Dynamic Content Loader
 * Loads goal page content from Supabase based on the current page
 */

(async function() {
    'use strict';

    // Wait for supabase client to be available
    if (typeof goalPagesAPI === 'undefined') {
        console.error('goalPagesAPI not available. Make sure supabase-client.js is loaded first.');
        return;
    }

    // Get current page filename
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';

    try {
        // Find the goal page data for the current page
        const pages = await goalPagesAPI.getAll();
        const pageData = pages.find(p => p.slug === currentPage);

        if (!pageData) {
            console.log('No dynamic content found for this page:', currentPage);
            return;
        }

        // Update page title
        if (pageData.label || pageData.title) {
            const labelEl = document.querySelector('.goal-label');
            const titleEl = document.querySelector('.goal-title');

            if (labelEl && pageData.label) {
                labelEl.textContent = pageData.label;
            }
            if (titleEl && pageData.title) {
                titleEl.textContent = pageData.title;
            }

            // Update document title
            document.title = `${pageData.label || ''} ${pageData.title || ''} — Omotani Caring Foundation`.trim();
        }

        // Update hero image
        if (pageData.hero_image) {
            const heroImg = document.querySelector('.goal-hero img');
            if (heroImg) {
                heroImg.src = pageData.hero_image;
                heroImg.alt = pageData.title || '';
            }
        }

        // Update funding information
        const funding = typeof pageData.funding === 'string' ? JSON.parse(pageData.funding || '[]') : (pageData.funding || []);
        if (funding.length > 0) {
            const fundingDiv = document.querySelector('.goal-funding');
            if (fundingDiv) {
                fundingDiv.innerHTML = '';
                funding.forEach(item => {
                    const p = document.createElement('p');
                    p.innerHTML = `<strong>${escapeHtml(item.label)}</strong> ${escapeHtml(item.amount)}`;
                    fundingDiv.appendChild(p);
                });
            }
        }

        // Update body content
        if (pageData.content) {
            const goalBody = document.querySelector('.goal-body');
            if (goalBody) {
                // Keep funding div if it exists
                const existingFunding = goalBody.querySelector('.goal-funding');
                goalBody.innerHTML = '';

                if (existingFunding && funding.length > 0) {
                    goalBody.appendChild(existingFunding);
                } else if (funding.length > 0) {
                    const fundingDiv = document.createElement('div');
                    fundingDiv.className = 'goal-funding';
                    funding.forEach(item => {
                        const p = document.createElement('p');
                        p.innerHTML = `<strong>${escapeHtml(item.label)}</strong> ${escapeHtml(item.amount)}`;
                        fundingDiv.appendChild(p);
                    });
                    goalBody.appendChild(fundingDiv);
                }

                // Add content paragraphs
                const paragraphs = pageData.content.split('\n\n');
                paragraphs.forEach(text => {
                    if (text.trim()) {
                        const p = document.createElement('p');
                        p.innerHTML = linkifyText(text.trim());
                        goalBody.appendChild(p);
                    }
                });
            }
        }

        // Update gallery
        const gallery = typeof pageData.gallery === 'string' ? JSON.parse(pageData.gallery || '[]') : (pageData.gallery || []);
        if (gallery.length > 0) {
            const galleryDiv = document.querySelector('.goal-gallery');
            if (galleryDiv) {
                galleryDiv.innerHTML = '';
                gallery.forEach(img => {
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    const imgEl = document.createElement('img');
                    imgEl.src = img.src;
                    imgEl.alt = img.alt || '';
                    imgEl.loading = 'lazy';
                    item.appendChild(imgEl);
                    galleryDiv.appendChild(item);
                });

                // Reinitialize lightbox for dynamically loaded gallery
                if (typeof window.initGalleryLightbox === 'function') {
                    window.initGalleryLightbox();
                }
            }
        }
    } catch (error) {
        console.error('Error loading goal page content:', error);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function linkifyText(text) {
        // Convert URLs in text to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    }
})();
