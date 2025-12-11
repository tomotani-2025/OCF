/**
 * Admin Post Creator for Omotani Caring Foundation
 *
 * Handles the creation of new blog posts with:
 * - Image carousel support
 * - YouTube/Vimeo video embedding
 * - PDF document links
 * - Live preview
 * - JSON generation
 */

class PostCreator {
    constructor() {
        this.form = document.getElementById('post-form');
        this.imagesContainer = document.getElementById('images-container');
        this.videosContainer = document.getElementById('videos-container');
        this.pdfsContainer = document.getElementById('pdfs-container');
        this.previewModal = document.getElementById('preview-modal');
        this.previewContainer = document.getElementById('preview-container');
        this.jsonOutput = document.getElementById('json-output');
        this.jsonCode = document.querySelector('#json-code code');

        this.imageCount = 0;
        this.videoCount = 0;
        this.pdfCount = 0;

        this.init();
    }

    init() {
        // Set default date to today
        const dateInput = document.getElementById('post-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Add first image field by default
        this.addImage();

        // Event listeners
        document.getElementById('add-image-btn').addEventListener('click', () => this.addImage());
        document.getElementById('add-video-btn').addEventListener('click', () => this.addVideo());
        document.getElementById('add-pdf-btn').addEventListener('click', () => this.addPdf());
        document.getElementById('preview-btn').addEventListener('click', () => this.showPreview());
        document.getElementById('copy-json-btn').addEventListener('click', () => this.copyJson());
        document.getElementById('download-json-btn').addEventListener('click', () => this.downloadJson());

        this.form.addEventListener('submit', (e) => this.generateJson(e));

        // Modal close handlers
        document.querySelector('.modal-close').addEventListener('click', () => this.closePreview());
        document.querySelector('.modal-backdrop').addEventListener('click', () => this.closePreview());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closePreview();
        });
    }

    // ========================================
    // Image Management
    // ========================================

    addImage() {
        this.imageCount++;
        const index = this.imageCount;

        const imageItem = document.createElement('div');
        imageItem.className = 'media-item';
        imageItem.dataset.index = index;
        imageItem.innerHTML = `
            <div class="media-item-header">
                <span class="media-item-number">Image ${index}</span>
                <button type="button" class="media-item-remove" data-action="remove-image">Remove</button>
            </div>
            <div class="form-row two-col">
                <div class="form-group">
                    <label for="image-src-${index}">Image Path *</label>
                    <input type="text" id="image-src-${index}" name="image-src-${index}"
                           placeholder="images/news/filename.jpg"
                           data-preview-target="image-preview-${index}">
                </div>
                <div class="image-preview" id="image-preview-${index}">
                    <span class="image-preview-placeholder">Image preview</span>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="image-alt-${index}">Alt Text / Caption</label>
                    <input type="text" id="image-alt-${index}" name="image-alt-${index}"
                           placeholder="Describe the image">
                </div>
            </div>
        `;

        this.imagesContainer.appendChild(imageItem);

        // Add event listeners
        const removeBtn = imageItem.querySelector('[data-action="remove-image"]');
        removeBtn.addEventListener('click', () => this.removeMediaItem(imageItem, 'image'));

        const srcInput = imageItem.querySelector(`#image-src-${index}`);
        srcInput.addEventListener('input', (e) => this.updateImagePreview(e.target));
    }

    updateImagePreview(input) {
        const previewId = input.dataset.previewTarget;
        const preview = document.getElementById(previewId);
        const src = input.value.trim();

        if (src) {
            preview.innerHTML = `<img src="${src}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=\\'image-preview-placeholder\\'>Image not found</span>'">`;
        } else {
            preview.innerHTML = '<span class="image-preview-placeholder">Image preview</span>';
        }
    }

    // ========================================
    // Video Management
    // ========================================

    addVideo() {
        this.videoCount++;
        const index = this.videoCount;

        const videoItem = document.createElement('div');
        videoItem.className = 'media-item';
        videoItem.dataset.index = index;
        videoItem.innerHTML = `
            <div class="media-item-header">
                <span class="media-item-number">Video ${index}</span>
                <button type="button" class="media-item-remove" data-action="remove-video">Remove</button>
            </div>
            <div class="form-row two-col">
                <div class="form-group">
                    <label for="video-url-${index}">Video URL *</label>
                    <input type="url" id="video-url-${index}" name="video-url-${index}"
                           placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                           data-preview-target="video-preview-${index}">
                    <small style="color: #666; font-size: 12px; margin-top: 4px;">Supports YouTube and Vimeo links</small>
                </div>
                <div class="video-preview" id="video-preview-${index}">
                    <div class="video-preview-placeholder">
                        <span>Video preview</span>
                    </div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="video-caption-${index}">Caption (optional)</label>
                    <input type="text" id="video-caption-${index}" name="video-caption-${index}"
                           placeholder="Video caption or description">
                </div>
            </div>
        `;

        this.videosContainer.appendChild(videoItem);

        // Add event listeners
        const removeBtn = videoItem.querySelector('[data-action="remove-video"]');
        removeBtn.addEventListener('click', () => this.removeMediaItem(videoItem, 'video'));

        const urlInput = videoItem.querySelector(`#video-url-${index}`);
        urlInput.addEventListener('input', (e) => this.updateVideoPreview(e.target));
    }

    updateVideoPreview(input) {
        const previewId = input.dataset.previewTarget;
        const preview = document.getElementById(previewId);
        const url = input.value.trim();
        const embedUrl = this.getVideoEmbedUrl(url);

        if (embedUrl) {
            preview.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
        } else {
            preview.innerHTML = '<div class="video-preview-placeholder"><span>Video preview</span></div>';
        }
    }

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

    getVideoType(url) {
        if (!url) return null;
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('vimeo.com')) return 'vimeo';
        return null;
    }

    // ========================================
    // PDF Management
    // ========================================

    addPdf() {
        this.pdfCount++;
        const index = this.pdfCount;

        const pdfItem = document.createElement('div');
        pdfItem.className = 'media-item';
        pdfItem.dataset.index = index;
        pdfItem.innerHTML = `
            <div class="media-item-header">
                <span class="media-item-number">PDF ${index}</span>
                <button type="button" class="media-item-remove" data-action="remove-pdf">Remove</button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="pdf-url-${index}">PDF URL *</label>
                    <input type="url" id="pdf-url-${index}" name="pdf-url-${index}"
                           placeholder="https://www.omotanicaringfoundation.com/s/document.pdf">
                </div>
            </div>
            <div class="form-row two-col">
                <div class="form-group">
                    <label for="pdf-title-${index}">Title *</label>
                    <input type="text" id="pdf-title-${index}" name="pdf-title-${index}"
                           placeholder="Document title">
                </div>
                <div class="form-group">
                    <label for="pdf-description-${index}">Description (optional)</label>
                    <input type="text" id="pdf-description-${index}" name="pdf-description-${index}"
                           placeholder="Brief description">
                </div>
            </div>
        `;

        this.pdfsContainer.appendChild(pdfItem);

        // Add event listeners
        const removeBtn = pdfItem.querySelector('[data-action="remove-pdf"]');
        removeBtn.addEventListener('click', () => this.removeMediaItem(pdfItem, 'pdf'));
    }

    // ========================================
    // Common Media Functions
    // ========================================

    removeMediaItem(item, type) {
        item.remove();
        this.renumberItems(type);
    }

    renumberItems(type) {
        const container = type === 'image' ? this.imagesContainer :
                         type === 'video' ? this.videosContainer : this.pdfsContainer;
        const items = container.querySelectorAll('.media-item');

        items.forEach((item, idx) => {
            const number = idx + 1;
            item.querySelector('.media-item-number').textContent =
                `${type.charAt(0).toUpperCase() + type.slice(1)} ${number}`;
        });
    }

    // ========================================
    // Data Collection
    // ========================================

    collectFormData() {
        const title = document.getElementById('post-title').value.trim();
        const date = document.getElementById('post-date').value;
        const category = document.getElementById('post-category').value;
        const author = document.getElementById('post-author').value.trim() || 'Les Omotani';
        const summary = document.getElementById('post-summary').value.trim();
        const content = document.getElementById('post-content').value.trim();

        // Generate ID from title
        const id = this.generateId(title, date);

        // Collect images
        const images = [];
        this.imagesContainer.querySelectorAll('.media-item').forEach((item) => {
            const srcInput = item.querySelector('input[id^="image-src-"]');
            const altInput = item.querySelector('input[id^="image-alt-"]');
            if (srcInput && srcInput.value.trim()) {
                images.push({
                    src: srcInput.value.trim(),
                    alt: altInput ? altInput.value.trim() : ''
                });
            }
        });

        // Collect videos
        const videos = [];
        this.videosContainer.querySelectorAll('.media-item').forEach((item) => {
            const urlInput = item.querySelector('input[id^="video-url-"]');
            const captionInput = item.querySelector('input[id^="video-caption-"]');
            if (urlInput && urlInput.value.trim()) {
                const url = urlInput.value.trim();
                videos.push({
                    type: this.getVideoType(url),
                    url: url,
                    embedUrl: this.getVideoEmbedUrl(url),
                    caption: captionInput ? captionInput.value.trim() : ''
                });
            }
        });

        // Collect PDFs
        const pdfs = [];
        this.pdfsContainer.querySelectorAll('.media-item').forEach((item) => {
            const urlInput = item.querySelector('input[id^="pdf-url-"]');
            const titleInput = item.querySelector('input[id^="pdf-title-"]');
            const descInput = item.querySelector('input[id^="pdf-description-"]');
            if (urlInput && urlInput.value.trim() && titleInput && titleInput.value.trim()) {
                pdfs.push({
                    url: urlInput.value.trim(),
                    title: titleInput.value.trim(),
                    description: descInput ? descInput.value.trim() : ''
                });
            }
        });

        return {
            id,
            title,
            date,
            year: new Date(date).getFullYear(),
            category,
            author,
            // Legacy single image field (first image for backwards compatibility)
            image: images.length > 0 ? images[0].src : '',
            imageAlt: images.length > 0 ? images[0].alt : '',
            // New multi-media fields
            images: images.length > 1 ? images : undefined,
            videos: videos.length > 0 ? videos : undefined,
            pdfs: pdfs.length > 0 ? pdfs : undefined,
            summary,
            content
        };
    }

    generateId(title, date) {
        const year = new Date(date).getFullYear();
        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
        return `${slug}-${year}`;
    }

    // ========================================
    // Preview
    // ========================================

    showPreview() {
        const data = this.collectFormData();
        this.renderPreview(data);
        this.previewModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    closePreview() {
        this.previewModal.hidden = true;
        document.body.style.overflow = '';
    }

    renderPreview(data) {
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        const formatContent = (content) => {
            if (!content) return '';
            return content
                .split(/\n\n+/)
                .map(p => p.trim())
                .filter(p => p.length > 0)
                .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
                .join('');
        };

        // Build images/carousel HTML
        let imagesHtml = '';
        const allImages = data.images || (data.image ? [{ src: data.image, alt: data.imageAlt }] : []);

        if (allImages.length > 0) {
            if (allImages.length === 1) {
                imagesHtml = `
                    <div class="preview-carousel">
                        <div class="preview-carousel-images">
                            <img src="${allImages[0].src}" alt="${allImages[0].alt || ''}" class="active">
                        </div>
                        ${allImages[0].alt ? `<p class="preview-carousel-caption">${allImages[0].alt}</p>` : ''}
                    </div>
                `;
            } else {
                const imagesMarkup = allImages.map((img, i) =>
                    `<img src="${img.src}" alt="${img.alt || ''}" class="${i === 0 ? 'active' : ''}" data-index="${i}">`
                ).join('');

                const dotsMarkup = allImages.map((_, i) =>
                    `<button type="button" class="${i === 0 ? 'active' : ''}" data-index="${i}"></button>`
                ).join('');

                imagesHtml = `
                    <div class="preview-carousel" data-carousel>
                        <div class="preview-carousel-images">
                            ${imagesMarkup}
                        </div>
                        <div class="preview-carousel-nav">
                            <button type="button" data-prev disabled>
                                <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                                    <path d="M7 1L1 7L7 13" stroke="#31110F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M1 7H17" stroke="#31110F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <button type="button" data-next>
                                <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                                    <path d="M11 1L17 7L11 13" stroke="#31110F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M17 7H1" stroke="#31110F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                        <div class="preview-carousel-dots">
                            ${dotsMarkup}
                        </div>
                        <p class="preview-carousel-caption" data-caption>${allImages[0].alt || ''}</p>
                    </div>
                `;
            }
        }

        // Build videos HTML
        let videosHtml = '';
        if (data.videos && data.videos.length > 0) {
            videosHtml = `
                <div class="preview-videos">
                    ${data.videos.map(video => `
                        <div class="preview-video-item">
                            <div class="preview-video-embed">
                                <iframe src="${video.embedUrl}" frameborder="0" allowfullscreen></iframe>
                            </div>
                            ${video.caption ? `<p class="preview-video-caption">${video.caption}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Build PDFs HTML
        let pdfsHtml = '';
        if (data.pdfs && data.pdfs.length > 0) {
            pdfsHtml = `
                <div class="preview-pdfs">
                    ${data.pdfs.map(pdf => `
                        <a href="${pdf.url}" target="_blank" rel="noopener" class="preview-pdf-item">
                            <div class="preview-pdf-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10 9 9 9 8 9"/>
                                </svg>
                            </div>
                            <div class="preview-pdf-info">
                                <p class="preview-pdf-title">${pdf.title}</p>
                                ${pdf.description ? `<p class="preview-pdf-description">${pdf.description}</p>` : ''}
                            </div>
                        </a>
                    `).join('')}
                </div>
            `;
        }

        this.previewContainer.innerHTML = `
            <div class="preview-category-badge">${data.category || 'Category'}</div>
            <h1 class="preview-title">${data.title || 'Post Title'}</h1>
            ${imagesHtml}
            <div class="preview-meta">
                <span>By ${data.author}</span>
                <span>${formatDate(data.date)}</span>
            </div>
            <div class="preview-content">
                ${formatContent(data.content)}
            </div>
            ${videosHtml}
            ${pdfsHtml}
        `;

        // Initialize carousel if multiple images
        if (allImages.length > 1) {
            this.initPreviewCarousel();
        }
    }

    initPreviewCarousel() {
        const carousel = this.previewContainer.querySelector('[data-carousel]');
        if (!carousel) return;

        const images = carousel.querySelectorAll('.preview-carousel-images img');
        const dots = carousel.querySelectorAll('.preview-carousel-dots button');
        const prevBtn = carousel.querySelector('[data-prev]');
        const nextBtn = carousel.querySelector('[data-next]');
        const caption = carousel.querySelector('[data-caption]');
        let currentIndex = 0;

        const updateCarousel = (index) => {
            images.forEach((img, i) => img.classList.toggle('active', i === index));
            dots.forEach((dot, i) => dot.classList.toggle('active', i === index));

            prevBtn.disabled = index === 0;
            nextBtn.disabled = index === images.length - 1;

            if (caption) {
                caption.textContent = images[index].alt || '';
            }

            currentIndex = index;
        };

        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) updateCarousel(currentIndex - 1);
        });

        nextBtn.addEventListener('click', () => {
            if (currentIndex < images.length - 1) updateCarousel(currentIndex + 1);
        });

        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => updateCarousel(i));
        });
    }

    // ========================================
    // JSON Generation
    // ========================================

    generateJson(e) {
        e.preventDefault();

        // Validate required fields
        const title = document.getElementById('post-title').value.trim();
        const date = document.getElementById('post-date').value;
        const category = document.getElementById('post-category').value;
        const summary = document.getElementById('post-summary').value.trim();
        const content = document.getElementById('post-content').value.trim();

        if (!title || !date || !category || !summary || !content) {
            alert('Please fill in all required fields.');
            return;
        }

        const data = this.collectFormData();

        // Clean up undefined values for cleaner JSON
        const cleanData = {};
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== '') {
                cleanData[key] = value;
            }
        }

        const jsonString = JSON.stringify(cleanData, null, 2);
        this.jsonCode.textContent = jsonString;
        this.jsonOutput.hidden = false;

        // Scroll to JSON output
        this.jsonOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    copyJson() {
        const jsonText = this.jsonCode.textContent;
        navigator.clipboard.writeText(jsonText).then(() => {
            const btn = document.getElementById('copy-json-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy. Please select and copy manually.');
        });
    }

    downloadJson() {
        const data = this.collectFormData();
        const cleanData = {};
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== '') {
                cleanData[key] = value;
            }
        }

        const jsonString = JSON.stringify(cleanData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.id || 'post'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PostCreator();
});
