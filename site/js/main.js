/**
 * Omotani Caring Foundation - Main JavaScript
 */

// Add js-enabled class immediately for reveal animations
document.documentElement.classList.add('js-enabled');

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navList = document.querySelector('.nav-list');

    if (menuToggle && navList) {
        menuToggle.addEventListener('click', function() {
            navList.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        // Close menu when clicking on a link
        navList.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                navList.classList.remove('active');
                menuToggle.classList.remove('active');
            });
        });
    }

    // Header scroll effect
    const header = document.querySelector('.site-header');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });

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

    // Scroll reveal animation for offering items and reveal-on-scroll elements
    const revealItems = document.querySelectorAll('.offering-item, .reveal-on-scroll');

    if ('IntersectionObserver' in window && revealItems.length > 0) {
        const revealObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: '0px 0px 0px 0px'
        });

        revealItems.forEach(function(item) {
            revealObserver.observe(item);
        });

        // Fallback: reveal all items after a short delay if observer doesn't trigger
        setTimeout(function() {
            revealItems.forEach(function(item) {
                if (!item.classList.contains('revealed')) {
                    item.classList.add('revealed');
                }
            });
        }, 2000);
    } else {
        // Fallback for browsers without IntersectionObserver
        revealItems.forEach(function(item) {
            item.classList.add('revealed');
        });
    }

    // Gallery lightbox (simple implementation)
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (galleryItems.length > 0) {
        // Create lightbox elements
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close">&times;</button>
                <img src="" alt="">
                <button class="lightbox-prev">&lsaquo;</button>
                <button class="lightbox-next">&rsaquo;</button>
            </div>
        `;
        document.body.appendChild(lightbox);

        const lightboxImg = lightbox.querySelector('img');
        const closeBtn = lightbox.querySelector('.lightbox-close');
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        let currentIndex = 0;

        function openLightbox(index) {
            currentIndex = index;
            const img = galleryItems[index].querySelector('img');
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }

        function showPrev() {
            currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
            const img = galleryItems[currentIndex].querySelector('img');
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
        }

        function showNext() {
            currentIndex = (currentIndex + 1) % galleryItems.length;
            const img = galleryItems[currentIndex].querySelector('img');
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
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

// Add lightbox styles dynamically
const lightboxStyles = document.createElement('style');
lightboxStyles.textContent = `
    .lightbox {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.9);
        z-index: 2000;
        align-items: center;
        justify-content: center;
    }

    .lightbox.active {
        display: flex;
    }

    .lightbox-content {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
    }

    .lightbox-content img {
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
    }

    .lightbox-close {
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        padding: 0.5rem;
    }

    .lightbox-prev,
    .lightbox-next {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        padding: 1rem;
        border-radius: 4px;
    }

    .lightbox-prev:hover,
    .lightbox-next:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .lightbox-prev {
        left: -60px;
    }

    .lightbox-next {
        right: -60px;
    }

    @media (max-width: 768px) {
        .lightbox-prev,
        .lightbox-next {
            display: none;
        }
    }
`;
document.head.appendChild(lightboxStyles);
