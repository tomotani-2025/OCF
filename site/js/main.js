/**
 * Omotani Caring Foundation - Main JavaScript
 */

// Add js-enabled class immediately for reveal animations
document.documentElement.classList.add('js-enabled');

// ========================================
// Utility Functions
// ========================================

// Simple HTML sanitization to prevent XSS attacks
window.sanitizeHTML = function(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

// Escape HTML entities for safe insertion
window.escapeHTML = function(str) {
    if (!str) return '';
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };
    return String(str).replace(/[&<>"'/]/g, char => escapeMap[char]);
};

// Debounce function to limit execution frequency
window.debounce = function(func, wait, immediate) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

// Throttle function to limit execution rate
window.throttle = function(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Font loading with localStorage caching (prevents FOUT/layout shift)
(function() {
    function showPage() {
        document.documentElement.classList.add('fonts-loaded');
    }

    // Check if fonts were previously loaded (instant on repeat visits)
    if (localStorage.getItem('fontsLoaded')) {
        showPage();
        return;
    }

    // Timeout fallback - always show page after 2 seconds max
    var timeout = setTimeout(function() {
        showPage();
    }, 2000);

    // Wait for fonts to load, then reveal page
    if ('fonts' in document) {
        document.fonts.ready.then(function() {
            clearTimeout(timeout);
            showPage();
            localStorage.setItem('fontsLoaded', 'true');
        });
    } else {
        // Fallback for older browsers
        clearTimeout(timeout);
        showPage();
    }
})();

// Smooth page transitions
(function() {
    // Handle clicks on internal links for smooth page exit
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');

        // Skip if: external link, anchor link, new tab, or special protocol
        if (!href ||
            href.startsWith('#') ||
            href.startsWith('http') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            link.target === '_blank' ||
            e.ctrlKey || e.metaKey || e.shiftKey) {
            return;
        }

        // Fade out and navigate
        e.preventDefault();
        document.body.classList.add('page-transitioning');

        setTimeout(function() {
            window.location.href = href;
        }, 150);
    });

    // Fade in on page load (handles back/forward navigation)
    window.addEventListener('pageshow', function(e) {
        document.body.classList.remove('page-transitioning');
    });
})();

// Global function to initialize reveal animations (can be called after dynamic content loads)
window.initRevealAnimations = function() {
    const revealItems = document.querySelectorAll('.reveal-on-scroll:not(.revealed), .offering-item:not(.revealed)');

    if ('IntersectionObserver' in window && revealItems.length > 0) {
        const revealObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0,
            rootMargin: '50px 0px 50px 0px'
        });

        revealItems.forEach(function(item) {
            const rect = item.getBoundingClientRect();
            const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
            if (inViewport) {
                // Instantly reveal elements already in viewport (no animation pop)
                item.classList.add('revealed', 'revealed-instant');
            } else {
                revealObserver.observe(item);
            }
        });
    } else {
        revealItems.forEach(function(item) {
            item.classList.add('revealed', 'revealed-instant');
        });
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navList = document.querySelector('.nav-list');

    // Create overlay element for mobile menu
    let menuOverlay = document.querySelector('.mobile-menu-overlay');
    if (!menuOverlay && menuToggle) {
        menuOverlay = document.createElement('div');
        menuOverlay.className = 'mobile-menu-overlay';
        document.body.appendChild(menuOverlay);
    }

    function openMobileMenu() {
        navList.classList.add('active');
        menuToggle.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.classList.add('menu-open');
        menuToggle.setAttribute('aria-expanded', 'true');
    }

    function closeMobileMenu() {
        navList.classList.remove('active');
        menuToggle.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
    }

    if (menuToggle && navList) {
        menuToggle.addEventListener('click', function() {
            if (navList.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        // Close menu when clicking overlay
        if (menuOverlay) {
            menuOverlay.addEventListener('click', closeMobileMenu);
        }

        // Close menu when clicking on a link
        navList.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', closeMobileMenu);
        });

        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navList.classList.contains('active')) {
                closeMobileMenu();
            }
        });

        // Close menu when resizing to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 1100 && navList.classList.contains('active')) {
                closeMobileMenu();
            }
        });
    }

    // Header scroll effect (throttled for performance)
    const header = document.querySelector('.site-header');

    const handleScroll = window.throttle(function() {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerOffset = 100;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Image lazy loading
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[data-src]');

        const imageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px'
        });

        lazyImages.forEach(function(img) {
            imageObserver.observe(img);
        });
    }

    // Initialize scroll reveal animations
    window.initRevealAnimations();

    // Gallery lightbox (matching news post style)
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (galleryItems.length > 0) {
        // Create lightbox elements (same style as news posts)
        const lightbox = document.createElement('div');
        lightbox.className = 'image-lightbox';
        lightbox.innerHTML = `
            <button class="lightbox-close" aria-label="Close fullscreen">
                <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
            <button class="lightbox-nav lightbox-prev" aria-label="Previous image">
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 1L1 7L7 13" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M1 7H17" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="lightbox-content">
                <img src="" alt="">
            </div>
            <button class="lightbox-nav lightbox-next" aria-label="Next image">
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 1L17 7L11 13" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M17 7H1" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="lightbox-caption">
                <span class="lightbox-count"></span>
                <span class="lightbox-text"></span>
            </div>
        `;
        document.body.appendChild(lightbox);

        const lightboxImg = lightbox.querySelector('.lightbox-content img');
        const closeBtn = lightbox.querySelector('.lightbox-close');
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        const lightboxCount = lightbox.querySelector('.lightbox-count');
        const lightboxText = lightbox.querySelector('.lightbox-text');
        let currentIndex = 0;

        function formatNumber(num) {
            return num.toString().padStart(2, '0');
        }

        function updateLightboxNav() {
            // Hide arrows at start/end
            prevBtn.style.display = currentIndex === 0 ? 'none' : 'flex';
            nextBtn.style.display = currentIndex === galleryItems.length - 1 ? 'none' : 'flex';
        }

        function openLightbox(index) {
            currentIndex = index;
            const img = galleryItems[index].querySelector('img');
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt || '';

            // Update count and caption
            lightboxCount.textContent = `${formatNumber(index + 1)}/${formatNumber(galleryItems.length)}`;
            lightboxText.textContent = img.alt || '';

            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
            updateLightboxNav();
        }

        function closeLightbox() {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }

        function showPrev() {
            if (currentIndex > 0) {
                currentIndex--;
                const img = galleryItems[currentIndex].querySelector('img');
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt || '';
                lightboxCount.textContent = `${formatNumber(currentIndex + 1)}/${formatNumber(galleryItems.length)}`;
                lightboxText.textContent = img.alt || '';
                updateLightboxNav();
            }
        }

        function showNext() {
            if (currentIndex < galleryItems.length - 1) {
                currentIndex++;
                const img = galleryItems[currentIndex].querySelector('img');
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt || '';
                lightboxCount.textContent = `${formatNumber(currentIndex + 1)}/${formatNumber(galleryItems.length)}`;
                lightboxText.textContent = img.alt || '';
                updateLightboxNav();
            }
        }

        galleryItems.forEach(function(item, index) {
            item.addEventListener('click', function() {
                openLightbox(index);
            });
        });

        closeBtn.addEventListener('click', closeLightbox);
        prevBtn.addEventListener('click', showPrev);
        nextBtn.addEventListener('click', showNext);

        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (!lightbox.classList.contains('active')) return;

            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') showPrev();
            if (e.key === 'ArrowRight') showNext();
        });
    }
});

// Lightbox styles are now in goal-page.css and styles.css
