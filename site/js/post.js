/**
 * Blog Post Page Handler for Omotani Caring Foundation
 *
 * This script handles loading and displaying individual blog posts.
 * Posts are loaded based on the 'id' URL parameter.
 *
 * Supports:
 * - Image carousels for posts with multiple images
 * - YouTube and Vimeo video embeds
 * - PDF document links
 *
 * Usage: post.html?id=post-id-here
 */

class BlogPost {
    constructor() {
        this.dataUrl = 'data/news-posts.json?v=2';
        this.posts = [];
        this.currentPost = null;
        this.currentIndex = -1;
        this.currentImageIndex = 0;
        this.images = [];
    }

    async init() {
        try {
            const postId = this.getPostIdFromUrl();
            if (!postId) {
                this.showError('No post specified');
                return;
            }

            await this.loadPosts();
            this.findCurrentPost(postId);

            if (!this.currentPost) {
                this.showError('Post not found');
                return;
            }

            this.render();
            this.setupNavigation();
            this.setupCarousel();
            this.setupFullscreen();
        } catch (error) {
            console.error('Failed to load post:', error);
            this.showError('Unable to load post');
        }
    }

    getPostIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async loadPosts() {
        const response = await fetch(this.dataUrl);
        if (!response.ok) {
            throw new Error(`Failed to load posts: ${response.status}`);
        }
        const data = await response.json();
        this.posts = data.posts || [];
        // Sort by date (newest first)
        this.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    findCurrentPost(postId) {
        this.currentIndex = this.posts.findIndex(post => post.id === postId);
        if (this.currentIndex !== -1) {
            this.currentPost = this.posts[this.currentIndex];
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    }

    formatContent(content) {
        if (!content) return '';

        // Split by double newlines to create paragraphs
        const paragraphs = content.split(/\n\n+/);

        return paragraphs
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => {
                // Replace single newlines with <br>
                p = p.replace(/\n/g, '<br>');
                // Auto-link URLs (but not if already inside an anchor tag)
                p = p.replace(
                    /(?<!href=["'])((https?:\/\/)[^\s<]+)/gi,
                    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
                );
                return `<p>${p}</p>`;
            })
            .join('');
    }

    render() {
        const post = this.currentPost;

        // Update page title
        document.title = `${post.title} — Omotani CARING Foundation`;

        // Update meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', post.summary || post.title);
        }

        // Category badge
        const categoryBadge = document.querySelector('.category-text');
        if (categoryBadge) {
            categoryBadge.textContent = post.category;
        }

        // Title
        const titleEl = document.querySelector('.post-title');
        if (titleEl) {
            titleEl.textContent = post.title;
        }

        // Images - use images array if available, otherwise fall back to single image
        this.images = post.images || [];
        if (this.images.length === 0 && post.image && post.image.trim() !== '') {
            this.images = [{
                src: post.image,
                alt: post.imageAlt || post.title
            }];
        }

        this.renderImages();

        // Author - "by" regular weight, author name medium weight
        const authorEl = document.querySelector('.post-author');
        if (authorEl) {
            authorEl.innerHTML = `by <span class="author-name">${post.author}</span>`;
        }

        // Date
        const dateEl = document.querySelector('.post-date');
        if (dateEl) {
            dateEl.textContent = this.formatDate(post.date);
        }

        // Content
        const contentEl = document.querySelector('.post-content');
        if (contentEl) {
            contentEl.innerHTML = this.formatContent(post.content);
        }

        // Videos
        this.renderVideos(post);

        // PDFs
        this.renderPDFs(post);
    }

    // Get video embed URL from various formats
    getVideoEmbedUrl(url) {
        if (!url) return null;

        // YouTube
        const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (youtubeMatch) {
            return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
        }

        // Vimeo
        const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        if (vimeoMatch) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }

        return null;
    }

    renderVideos(post) {
        const videosContainer = document.querySelector('.post-videos');
        if (!videosContainer) return;

        // Check for videos array
        if (!post.videos || !Array.isArray(post.videos) || post.videos.length === 0) {
            videosContainer.hidden = true;
            return;
        }

        const videosHtml = post.videos.map(video => {
            const embedUrl = video.embedUrl || this.getVideoEmbedUrl(video.url);
            if (!embedUrl) return '';

            return `
                <div class="post-video-item">
                    <div class="post-video-embed">
                        <iframe
                            src="${embedUrl}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                        ></iframe>
                    </div>
                    ${video.caption ? `<p class="post-video-caption">${video.caption}</p>` : ''}
                </div>
            `;
        }).filter(html => html).join('');

        if (videosHtml) {
            videosContainer.innerHTML = videosHtml;
            videosContainer.hidden = false;
        } else {
            videosContainer.hidden = true;
        }
    }

    renderPDFs(post) {
        const pdfsContainer = document.querySelector('.post-pdfs');
        if (!pdfsContainer) return;

        // Check for pdfs array
        if (!post.pdfs || !Array.isArray(post.pdfs) || post.pdfs.length === 0) {
            pdfsContainer.hidden = true;
            return;
        }

        const pdfsHtml = post.pdfs.map(pdf => `
            <a href="${pdf.url}" target="_blank" rel="noopener" class="post-pdf-link">
                <div class="post-pdf-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                </div>
                <div class="post-pdf-info">
                    <p class="post-pdf-title">${pdf.title}</p>
                    ${pdf.description ? `<p class="post-pdf-description">${pdf.description}</p>` : ''}
                </div>
                <span class="post-pdf-download">Download PDF</span>
            </a>
        `).join('');

        pdfsContainer.innerHTML = pdfsHtml;
        pdfsContainer.hidden = false;
    }

    renderImages() {
        const imageContainer = document.querySelector('.post-image-container');
        const paginationContainer = document.querySelector('.post-image-pagination');
        const post = this.currentPost;

        // Check for featured video (replaces image carousel)
        if (post.featuredVideo) {
            const embedUrl = this.getVideoEmbedUrl(post.featuredVideo.url || post.featuredVideo);
            if (embedUrl && imageContainer) {
                imageContainer.style.display = 'flex';
                imageContainer.innerHTML = `
                    <div class="featured-video-wrapper">
                        <iframe
                            src="${embedUrl}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                        ></iframe>
                    </div>
                    ${post.featuredVideo.caption ? `<div class="post-image-caption"><span class="caption-text">${post.featuredVideo.caption}</span></div>` : ''}
                `;
                if (paginationContainer) paginationContainer.classList.remove('visible');
                return;
            }
        }

        if (this.images.length === 0) {
            if (imageContainer) imageContainer.style.display = 'none';
            if (paginationContainer) paginationContainer.classList.remove('visible');
            return;
        }

        if (imageContainer) {
            imageContainer.style.display = 'flex';

            // Format image number with leading zero
            const formatNumber = (num) => num.toString().padStart(2, '0');
            const totalImages = this.images.length;

            // Generate pagination dots HTML - inside carousel-images for proper positioning
            const paginationHTML = this.images.length > 1 ? `
                <div class="post-image-pagination visible">
                    ${this.images.map((_, idx) => `
                        <span class="pagination-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
                    `).join('')}
                </div>
            ` : '';

            // Create carousel HTML with pagination inside carousel-images
            const carouselHTML = `
                <div class="carousel-wrapper">
                    <button class="carousel-arrow carousel-prev" aria-label="Previous image">
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 1L1 7L7 13" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M1 7H17" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="carousel-images">
                        ${this.images.map((img, idx) => `
                            <img
                                class="post-image ${idx === 0 ? 'active' : ''}"
                                src="${img.src}"
                                alt="${img.alt || ''}"
                                data-index="${idx}"
                                loading="${idx === 0 ? 'eager' : 'lazy'}"
                                onerror="this.onerror=null; this.src='${img.originalUrl || img.src}';"
                            >
                        `).join('')}
                        ${paginationHTML}
                    </div>
                    <button class="carousel-arrow carousel-next" aria-label="Next image">
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 1L17 7L11 13" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M17 7H1" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="post-image-caption">
                    <span class="caption-count">${formatNumber(1)}/${formatNumber(totalImages)}</span>
                    <span class="caption-text">${this.images[0].alt || ''}</span>
                    <button class="caption-fullscreen" aria-label="View fullscreen" title="View fullscreen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#31110F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                        </svg>
                    </button>
                </div>
            `;

            imageContainer.innerHTML = carouselHTML;

            // Hide arrows if only one image
            if (this.images.length <= 1) {
                const arrows = imageContainer.querySelectorAll('.carousel-arrow');
                arrows.forEach(arrow => arrow.style.display = 'none');
            } else {
                // Hide prev arrow initially (at first image)
                const prevArrow = imageContainer.querySelector('.carousel-prev');
                if (prevArrow) prevArrow.style.display = 'none';
            }
        }

        // Legacy: Remove external pagination container if it exists (no longer used)
        if (paginationContainer) {
            paginationContainer.classList.remove('visible');
            paginationContainer.innerHTML = '';
            if (this.images.length > 1) {
                // Pagination is now rendered inside carousel-wrapper
            } else {
                paginationContainer.classList.remove('visible');
            }
        }
    }

    setupCarousel() {
        if (this.images.length <= 1) return;

        const imageContainer = document.querySelector('.post-image-container');
        const paginationContainer = document.querySelector('.post-image-pagination');

        if (!imageContainer) return;

        // Arrow navigation
        const prevBtn = imageContainer.querySelector('.carousel-prev');
        const nextBtn = imageContainer.querySelector('.carousel-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateCarousel(-1));
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateCarousel(1));
        }

        // Dot navigation
        if (paginationContainer) {
            paginationContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('pagination-dot')) {
                    const index = parseInt(e.target.dataset.index);
                    this.goToImage(index);
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.navigateCarousel(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateCarousel(1);
            }
        });

        // Touch/swipe support
        let touchStartX = 0;
        let touchEndX = 0;

        const carouselWrapper = imageContainer.querySelector('.carousel-wrapper');
        if (carouselWrapper) {
            carouselWrapper.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            carouselWrapper.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                const diff = touchStartX - touchEndX;
                if (Math.abs(diff) > 50) { // Minimum swipe distance
                    this.navigateCarousel(diff > 0 ? 1 : -1);
                }
            }, { passive: true });
        }
    }

    navigateCarousel(direction) {
        const newIndex = this.currentImageIndex + direction;
        if (newIndex >= 0 && newIndex < this.images.length) {
            this.goToImage(newIndex);
        }
    }

    goToImage(index) {
        if (index < 0 || index >= this.images.length) return;

        this.currentImageIndex = index;

        // Update images
        const images = document.querySelectorAll('.carousel-images .post-image');
        images.forEach((img, i) => {
            img.classList.toggle('active', i === index);
        });

        // Update pagination dots
        const dots = document.querySelectorAll('.pagination-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        // Update caption with image text and count
        const captionText = document.querySelector('.caption-text');
        const captionCount = document.querySelector('.caption-count');
        if (captionText && this.images[index]) {
            captionText.textContent = this.images[index].alt || '';
        }
        if (captionCount) {
            const formatNumber = (num) => num.toString().padStart(2, '0');
            captionCount.textContent = `${formatNumber(index + 1)}/${formatNumber(this.images.length)}`;
        }

        // Update arrow states - hide arrows when at start/end
        const prevBtn = document.querySelector('.carousel-prev');
        const nextBtn = document.querySelector('.carousel-next');
        if (prevBtn) {
            prevBtn.style.display = index === 0 ? 'none' : 'flex';
        }
        if (nextBtn) {
            nextBtn.style.display = index === this.images.length - 1 ? 'none' : 'flex';
        }
    }

    setupNavigation() {
        const prevLink = document.querySelector('.nav-prev');
        const nextLink = document.querySelector('.nav-next');

        // Previous post (newer - lower index)
        if (this.currentIndex > 0) {
            const prevPost = this.posts[this.currentIndex - 1];
            if (prevLink) {
                prevLink.href = `post.html?id=${prevPost.id}`;
                prevLink.classList.remove('disabled');
            }
        } else {
            if (prevLink) {
                prevLink.classList.add('disabled');
                prevLink.removeAttribute('href');
            }
        }

        // Next post (older - higher index)
        if (this.currentIndex < this.posts.length - 1) {
            const nextPost = this.posts[this.currentIndex + 1];
            if (nextLink) {
                nextLink.href = `post.html?id=${nextPost.id}`;
                nextLink.classList.remove('disabled');
            }
        } else {
            if (nextLink) {
                nextLink.classList.add('disabled');
                nextLink.removeAttribute('href');
            }
        }
    }

    setupFullscreen() {
        if (this.images.length === 0) return;

        // Create lightbox if it doesn't exist
        let lightbox = document.querySelector('.image-lightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
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
        }

        const fullscreenBtn = document.querySelector('.caption-fullscreen');
        const closeBtn = lightbox.querySelector('.lightbox-close');
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        const lightboxImg = lightbox.querySelector('.lightbox-content img');
        const lightboxCaption = lightbox.querySelector('.lightbox-caption');

        // Open lightbox
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.openLightbox();
            });
        }

        // Close lightbox
        closeBtn.addEventListener('click', () => this.closeLightbox());

        // Click outside to close
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                this.closeLightbox();
            }
        });

        // Navigation
        prevBtn.addEventListener('click', () => this.lightboxNavigate(-1));
        nextBtn.addEventListener('click', () => this.lightboxNavigate(1));

        // Keyboard navigation in lightbox
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;

            if (e.key === 'Escape') {
                this.closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                this.lightboxNavigate(-1);
            } else if (e.key === 'ArrowRight') {
                this.lightboxNavigate(1);
            }
        });

        // Hide nav buttons if only one image
        if (this.images.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }
    }

    openLightbox() {
        const lightbox = document.querySelector('.image-lightbox');
        const lightboxImg = lightbox.querySelector('.lightbox-content img');
        const lightboxCount = lightbox.querySelector('.lightbox-count');
        const lightboxText = lightbox.querySelector('.lightbox-text');

        const currentImage = this.images[this.currentImageIndex];
        lightboxImg.src = currentImage.src;
        lightboxImg.alt = currentImage.alt || '';

        // Update count and caption text
        const formatNumber = (num) => num.toString().padStart(2, '0');
        lightboxCount.textContent = `${formatNumber(this.currentImageIndex + 1)}/${formatNumber(this.images.length)}`;
        lightboxText.textContent = currentImage.alt || '';

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';

        this.updateLightboxNav();
    }

    closeLightbox() {
        const lightbox = document.querySelector('.image-lightbox');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    lightboxNavigate(direction) {
        const newIndex = this.currentImageIndex + direction;
        if (newIndex >= 0 && newIndex < this.images.length) {
            this.currentImageIndex = newIndex;
            this.goToImage(newIndex);

            const lightbox = document.querySelector('.image-lightbox');
            const lightboxImg = lightbox.querySelector('.lightbox-content img');
            const lightboxCount = lightbox.querySelector('.lightbox-count');
            const lightboxText = lightbox.querySelector('.lightbox-text');

            const currentImage = this.images[this.currentImageIndex];
            lightboxImg.src = currentImage.src;
            lightboxImg.alt = currentImage.alt || '';

            // Update count and caption text
            const formatNumber = (num) => num.toString().padStart(2, '0');
            lightboxCount.textContent = `${formatNumber(this.currentImageIndex + 1)}/${formatNumber(this.images.length)}`;
            lightboxText.textContent = currentImage.alt || '';

            this.updateLightboxNav();
        }
    }

    updateLightboxNav() {
        const lightbox = document.querySelector('.image-lightbox');
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');

        // Hide arrows when at start/end instead of just disabling
        prevBtn.style.display = this.currentImageIndex === 0 ? 'none' : 'flex';
        nextBtn.style.display = this.currentImageIndex === this.images.length - 1 ? 'none' : 'flex';
    }

    showError(message) {
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = `
                <section class="post-section">
                    <div class="post-container post-error">
                        <h2>Oops!</h2>
                        <p>${message}</p>
                        <a href="news-updates.html">← Back to News + Updates</a>
                    </div>
                </section>
            `;
        }
        document.title = 'Post Not Found — Omotani CARING Foundation';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const blogPost = new BlogPost();
    blogPost.init();
});
