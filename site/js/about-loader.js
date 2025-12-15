/**
 * About Us Page Dynamic Content Loader
 * Loads trustees and advisor content from Supabase
 */

(async function() {
    'use strict';

    // Wait for supabase client to be available
    if (typeof aboutAPI === 'undefined') {
        console.error('aboutAPI not available. Make sure supabase-client.js is loaded first.');
        return;
    }

    try {
        const content = await aboutAPI.getContent();

        // Load trustees text
        const trusteesItem = content.find(c => c.type === 'trustees');
        if (trusteesItem && trusteesItem.content) {
            const trusteesBlock = document.querySelector('.trustees-block p');
            if (trusteesBlock) {
                trusteesBlock.textContent = trusteesItem.content;
            }
        }

        // Load advisors
        const advisors = content.filter(c => c.type === 'advisor').sort((a, b) => a.sort_order - b.sort_order);

        if (advisors.length > 0) {
            const advisorsBlock = document.querySelector('.advisors-block');
            if (advisorsBlock) {
                // Remove existing advisor cards (keep the h2)
                const existingCards = advisorsBlock.querySelectorAll('.advisor-card-new');
                existingCards.forEach(card => card.remove());

                // Add new advisor cards
                advisors.forEach(advisor => {
                    const data = typeof advisor.data === 'string' ? JSON.parse(advisor.data) : (advisor.data || {});
                    const card = createAdvisorCard(data);
                    advisorsBlock.appendChild(card);
                });

                // Re-initialize reveal animations for dynamically loaded content
                if (typeof window.initRevealAnimations === 'function') {
                    window.initRevealAnimations();
                }
            }
        }
    } catch (error) {
        console.error('Error loading about content:', error);
    }

    function createAdvisorCard(data) {
        const card = document.createElement('div');
        card.className = `advisor-card-new${data.tallCard ? ' advisor-card-tall' : ''} reveal-on-scroll`;

        // Photo
        const photo = document.createElement('div');
        photo.className = 'advisor-photo';
        photo.style.backgroundImage = `url('${data.photo || ''}')`;
        card.appendChild(photo);

        // Info container
        const info = document.createElement('div');
        info.className = 'advisor-info';

        // Name and title
        const title = document.createElement('h3');
        title.textContent = data.title ? `${data.name}, ${data.title}` : data.name;
        info.appendChild(title);

        // Bio paragraphs
        if (data.bio) {
            const paragraphs = data.bio.split('\n\n');
            paragraphs.forEach(p => {
                if (p.trim()) {
                    const para = document.createElement('p');
                    para.innerHTML = linkifyText(p.trim());
                    info.appendChild(para);
                }
            });
        }

        // Footer with links and partner logo
        if ((data.links && data.links.length > 0) || data.partnerLogo) {
            const footer = document.createElement('div');
            footer.className = 'advisor-footer';

            // Links
            if (data.links && data.links.length > 0) {
                const linksDiv = document.createElement('div');
                linksDiv.className = 'advisor-links-new';

                data.links.forEach(link => {
                    if (link.label && link.url) {
                        // Check if it's a multi-line link item (contains <br> or has organization format)
                        if (link.label.includes('\n') || link.label.includes('|')) {
                            const linkItem = document.createElement('p');
                            linkItem.className = 'link-item';
                            linkItem.innerHTML = formatLinkItem(link);
                            linksDiv.appendChild(linkItem);
                        } else {
                            const a = document.createElement('a');
                            a.href = link.url;
                            a.textContent = link.label;
                            a.target = '_blank';
                            a.rel = 'noopener';
                            linksDiv.appendChild(a);
                        }
                    }
                });

                footer.appendChild(linksDiv);
            }

            // Partner logo
            if (data.partnerLogo) {
                const logo = document.createElement('img');
                logo.src = data.partnerLogo;
                logo.alt = data.partnerName || 'Partner';
                logo.className = 'advisor-partner-logo';
                footer.appendChild(logo);
            }

            info.appendChild(footer);
        }

        card.appendChild(info);
        return card;
    }

    function linkifyText(text) {
        // Convert URLs in text to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    }

    function formatLinkItem(link) {
        // For complex link items with organization names
        return `<strong>${escapeHtml(link.label)}</strong><br><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.url)}</a>`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
