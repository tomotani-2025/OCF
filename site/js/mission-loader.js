/**
 * Our Mission Page Dynamic Content Loader
 * Loads mission statements and goal cards from Supabase
 */

(async function() {
    'use strict';

    // Wait for supabase client to be available
    if (typeof missionAPI === 'undefined') {
        console.error('missionAPI not available. Make sure supabase-client.js is loaded first.');
        return;
    }

    try {
        // Load all content in parallel
        const [statements, goalCards, settings] = await Promise.all([
            missionAPI.getStatements(),
            missionAPI.getGoalCards(),
            missionAPI.getSettings()
        ]);

        // Update mission breaker image
        if (settings?.breaker_image) {
            const breakerSection = document.querySelector('.mission-image-breaker');
            if (breakerSection) {
                breakerSection.style.backgroundImage = `url('${settings.breaker_image}')`;
            }
        }

        // Update mission statements
        if (statements.length > 0) {
            const statementsBody = document.querySelector('.mission-statement-body');
            if (statementsBody) {
                statementsBody.innerHTML = '';
                statements.forEach(statement => {
                    const div = document.createElement('div');
                    div.className = `mission-statement${statement.full_width ? ' full-width' : ''} reveal-on-scroll`;
                    const p = document.createElement('p');
                    p.textContent = statement.content;
                    div.appendChild(p);
                    statementsBody.appendChild(div);
                });
            }
        }

        // Update goal cards
        if (goalCards.length > 0) {
            const goalsGrid = document.querySelector('.goals-grid');
            if (goalsGrid) {
                goalsGrid.innerHTML = '';
                goalCards.forEach(card => {
                    const goalCard = createGoalCard(card);
                    goalsGrid.appendChild(goalCard);
                });
            }
        }
        // Re-initialize reveal animations for dynamically loaded content
        if (typeof window.initRevealAnimations === 'function') {
            window.initRevealAnimations();
        }

    } catch (error) {
        console.error('Error loading mission content:', error);
    }

    function createGoalCard(card) {
        const div = document.createElement('div');
        div.className = 'goal-card reveal-on-scroll';

        // Image
        const imageDiv = document.createElement('div');
        imageDiv.className = 'goal-image';
        const img = document.createElement('img');
        img.src = card.image || '';
        img.alt = card.title || '';
        imageDiv.appendChild(img);
        div.appendChild(imageDiv);

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'goal-content';

        // Title with label
        const h3 = document.createElement('h3');
        if (card.label) {
            h3.innerHTML = `${escapeHtml(card.label)}<strong>${escapeHtml(card.title)}</strong>`;
        } else {
            h3.innerHTML = `<strong>${escapeHtml(card.title)}</strong>`;
        }
        contentDiv.appendChild(h3);

        // Subtitle if exists
        if (card.subtitle) {
            const h4 = document.createElement('h4');
            h4.textContent = card.subtitle;
            contentDiv.appendChild(h4);
        }

        // Description
        const p = document.createElement('p');
        p.textContent = card.description || '';
        contentDiv.appendChild(p);

        // Learn More link
        const link = document.createElement('a');
        link.href = card.link || '#';
        link.className = 'btn btn-outline';
        link.innerHTML = `Learn More <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><path d="M1 7H17M17 7L11 1M17 7L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        contentDiv.appendChild(link);

        div.appendChild(contentDiv);
        return div;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
