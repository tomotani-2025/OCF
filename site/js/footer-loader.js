/**
 * Footer Loader
 *
 * Loads footer content from Supabase and updates the page footer dynamically.
 * Include this script after main.js on pages that should have dynamic footer content.
 */

(function() {
    const SUPABASE_URL = 'https://wafdatyvcgimpsetelyb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZmRhdHl2Y2dpbXBzZXRlbHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY2NjcsImV4cCI6MjA4MTA3MjY2N30.khU-SsaThjovP0H29DWHuxBraiYS0YWY2c8rTEEir4o';

    async function loadFooterSettings() {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/footer_settings?select=*&limit=1`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn('Footer settings not available');
                return null;
            }

            const data = await response.json();
            return data[0] || null;
        } catch (error) {
            console.warn('Error loading footer settings:', error);
            return null;
        }
    }

    function updateFooter(settings) {
        if (!settings) return;

        const footer = document.querySelector('.site-footer');
        if (!footer) return;

        // Update tagline
        const tagline = footer.querySelector('.footer-subhead');
        if (tagline && settings.tagline) {
            tagline.textContent = settings.tagline;
        }

        // Update footer image
        const footerImage = footer.querySelector('.footer-image img');
        if (footerImage) {
            if (settings.image_url) {
                footerImage.src = settings.image_url;
            }
            if (settings.image_alt) {
                footerImage.alt = settings.image_alt;
            }
        }

        // Update foundation info
        const footerColumns = footer.querySelectorAll('.footer-column');

        if (footerColumns[0]) {
            // First column: Foundation description and EIN
            const firstColParagraphs = footerColumns[0].querySelectorAll('p');
            if (firstColParagraphs[0] && settings.foundation_description) {
                firstColParagraphs[0].innerHTML = settings.foundation_description.replace(/\n/g, '<br>');
            }
            if (firstColParagraphs[1] && settings.ein) {
                firstColParagraphs[1].innerHTML = `<strong>EIN:</strong> ${settings.ein}`;
            }
        }

        if (footerColumns[1]) {
            // Second column: Email and Address
            const emailLink = footerColumns[1].querySelector('a[href^="mailto:"]');
            if (emailLink && settings.contact_email) {
                emailLink.href = `mailto:${settings.contact_email}`;
                emailLink.textContent = settings.contact_email;
            }

            const addressP = footerColumns[1].querySelector('p');
            if (addressP && (settings.address_street || settings.address_city_state || settings.address_zip)) {
                const street = settings.address_street || '';
                const cityState = settings.address_city_state || '';
                const zip = settings.address_zip || '';
                addressP.innerHTML = `${street}<br>${cityState}<br>${zip}`;
            }
        }

        // Update copyright
        const copyrightSpans = footer.querySelectorAll('.footer-copyright span');
        if (copyrightSpans[0] && settings.copyright_name) {
            copyrightSpans[0].textContent = settings.copyright_name;
        }
        if (copyrightSpans[1]) {
            const year = settings.copyright_year || new Date().getFullYear();
            copyrightSpans[1].innerHTML = `&copy; ${year} All Rights Reserved`;
        }
    }

    // Load and apply footer settings when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            const settings = await loadFooterSettings();
            updateFooter(settings);
        });
    } else {
        loadFooterSettings().then(updateFooter);
    }
})();
