/**
 * Admin Dashboard for Omotani Caring Foundation
 *
 * Features:
 * - View all posts in a table
 * - Create new posts with image/PDF uploads
 * - Edit existing posts
 * - Delete posts
 * - Direct publishing via GitHub API
 * - Search and filter posts
 */

class AdminDashboard {
    constructor() {
        this.dataUrl = 'data/news-posts.json?v=' + Date.now();
        this.posts = [];
        this.filteredPosts = [];
        this.editingPostId = null;
        this.deletePostId = null;
        this.pendingUploads = [];

        // API endpoints (Netlify Functions)
        this.apiBase = '/.netlify/functions';

        // DOM Elements
        this.dashboard = document.getElementById('posts-dashboard');
        this.editor = document.getElementById('post-editor');
        this.form = document.getElementById('post-form');
        this.imagesContainer = document.getElementById('images-container');
        this.videosContainer = document.getElementById('videos-container');
        this.pdfsContainer = document.getElementById('pdfs-container');
        this.previewModal = document.getElementById('preview-modal');
        this.previewContainer = document.getElementById('preview-container');
        this.deleteModal = document.getElementById('delete-modal');
        this.publishingModal = document.getElementById('publishing-modal');

        this.imageCount = 0;
        this.videoCount = 0;
        this.pdfCount = 0;

        this.init();
    }

    async init() {
        await this.loadPosts();
        this.renderPostsTable();
        this.setupEventListeners();
    }

    // ========================================
    // Data Loading
    // ========================================

    async loadPosts() {
        try {
            const response = await fetch(this.dataUrl);
            if (!response.ok) throw new Error('Failed to load posts');
            const data = await response.json();
            this.posts = data.posts || [];
            this.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.filteredPosts = [...this.posts];
        } catch (error) {
            console.error('Error loading posts:', error);
            this.posts = [];
            this.filteredPosts = [];
        }
    }

    // ========================================
    // Event Listeners
    // ========================================

    setupEventListeners() {
        // Dashboard actions
        document.getElementById('create-new-btn').addEventListener('click', () => this.showEditor());
        document.getElementById('search-posts').addEventListener('input', (e) => this.filterPosts(e.target.value));
        document.getElementById('filter-category').addEventListener('change', (e) => this.filterByCategory(e.target.value));

        // Editor actions
        document.getElementById('back-to-dashboard').addEventListener('click', () => this.showDashboard());
        document.getElementById('cancel-btn').addEventListener('click', () => this.showDashboard());
        document.getElementById('preview-btn').addEventListener('click', () => this.showPreview());
        document.getElementById('add-image-btn').addEventListener('click', () => this.addImage());
        document.getElementById('add-video-btn').addEventListener('click', () => this.addVideo());
        document.getElementById('add-pdf-btn').addEventListener('click', () => this.addPdf());
        this.form.addEventListener('submit', (e) => this.publishPost(e));

        // Delete modal actions
        document.getElementById('cancel-delete-btn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-delete-btn').addEventListener('click', () => this.confirmDelete());

        // Modal close handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => this.closeAllModals());
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
        });
    }

    // ========================================
    // Dashboard View
    // ========================================

    showDashboard() {
        this.editor.hidden = true;
        this.dashboard.hidden = false;
        this.editingPostId = null;
        this.pendingUploads = [];
        this.resetForm();
    }

    renderPostsTable() {
        const tbody = document.getElementById('posts-table-body');
        const countText = document.getElementById('posts-count-text');

        if (this.filteredPosts.length === 0) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="5">No posts found</td>
                </tr>
            `;
            countText.textContent = '0 posts';
            return;
        }

        tbody.innerHTML = this.filteredPosts.map(post => {
            const hasImages = post.image || (post.images && post.images.length > 0);
            const hasVideos = post.videos && post.videos.length > 0;
            const hasPdfs = post.pdfs && post.pdfs.length > 0;
            const hasFeaturedVideo = post.featuredVideo;

            return `
                <tr data-id="${post.id}">
                    <td class="col-date">${this.formatDateShort(post.date)}</td>
                    <td class="col-title">
                        <a href="post.html?id=${post.id}" target="_blank" class="post-table-title">${post.title}</a>
                        <span class="post-table-summary">${post.summary || ''}</span>
                    </td>
                    <td class="col-category">
                        <span class="category-badge">${post.category}</span>
                    </td>
                    <td class="col-media">
                        <div class="media-icons">
                            <span class="media-icon ${hasImages ? 'has-media' : ''}" title="${hasImages ? 'Has images' : 'No images'}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                            </span>
                            <span class="media-icon ${hasVideos || hasFeaturedVideo ? 'has-media' : ''}" title="${hasVideos || hasFeaturedVideo ? 'Has videos' : 'No videos'}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="23 7 16 12 23 17 23 7"/>
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                                </svg>
                            </span>
                            <span class="media-icon ${hasPdfs ? 'has-media' : ''}" title="${hasPdfs ? 'Has PDFs' : 'No PDFs'}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                </svg>
                            </span>
                        </div>
                    </td>
                    <td class="col-actions">
                        <div class="action-buttons">
                            <button class="btn-action btn-edit" data-action="edit" data-id="${post.id}">Edit</button>
                            <button class="btn-action btn-delete" data-action="delete" data-id="${post.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add click handlers
        tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => this.editPost(btn.dataset.id));
        });
        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => this.showDeleteModal(btn.dataset.id));
        });

        countText.textContent = `${this.filteredPosts.length} post${this.filteredPosts.length !== 1 ? 's' : ''}`;
    }

    filterPosts(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const categoryFilter = document.getElementById('filter-category').value;

        this.filteredPosts = this.posts.filter(post => {
            const matchesSearch = !term ||
                post.title.toLowerCase().includes(term) ||
                (post.summary && post.summary.toLowerCase().includes(term)) ||
                (post.content && post.content.toLowerCase().includes(term));

            const matchesCategory = categoryFilter === 'all' || post.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });

        this.renderPostsTable();
    }

    filterByCategory(category) {
        const searchTerm = document.getElementById('search-posts').value;
        this.filterPosts(searchTerm);
    }

    formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // ========================================
    // Editor View
    // ========================================

    showEditor(postId = null) {
        this.dashboard.hidden = true;
        this.editor.hidden = false;
        this.editingPostId = postId;
        this.pendingUploads = [];

        const title = document.getElementById('editor-title');
        const subtitle = document.getElementById('editor-subtitle');
        const saveBtn = document.getElementById('save-btn');

        if (postId) {
            title.textContent = 'Edit Post';
            subtitle.textContent = 'Make changes to the post. Click Publish to save your changes.';
            saveBtn.textContent = 'Publish Changes';
            this.loadPostIntoForm(postId);
        } else {
            title.textContent = 'Create New Post';
            subtitle.textContent = 'Fill out the form below. Click Publish when ready.';
            saveBtn.textContent = 'Publish Post';
            this.resetForm();
            this.addImage(); // Add one empty image field by default
        }
    }

    editPost(postId) {
        this.showEditor(postId);
    }

    loadPostIntoForm(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        document.getElementById('edit-post-id').value = postId;
        document.getElementById('post-title').value = post.title || '';
        document.getElementById('post-date').value = post.date || '';
        document.getElementById('post-category').value = post.category || '';
        document.getElementById('post-author').value = post.author || 'Les Omotani';
        document.getElementById('post-summary').value = post.summary || '';
        document.getElementById('post-content').value = post.content || '';

        // Featured video
        const featuredVideoInput = document.getElementById('featured-video-url');
        if (featuredVideoInput) {
            if (post.featuredVideo) {
                featuredVideoInput.value = typeof post.featuredVideo === 'string'
                    ? post.featuredVideo
                    : post.featuredVideo.url || '';
            } else {
                featuredVideoInput.value = '';
            }
        }

        // Load images
        this.imagesContainer.innerHTML = '';
        this.imageCount = 0;
        const images = post.images || (post.image ? [{ src: post.image, alt: post.imageAlt || '' }] : []);
        if (images.length > 0) {
            images.forEach(img => this.addImage(img.src, img.alt));
        } else {
            this.addImage();
        }

        // Load videos
        this.videosContainer.innerHTML = '';
        this.videoCount = 0;
        if (post.videos && post.videos.length > 0) {
            post.videos.forEach(video => this.addVideo(video.url, video.caption));
        }

        // Load PDFs
        this.pdfsContainer.innerHTML = '';
        this.pdfCount = 0;
        if (post.pdfs && post.pdfs.length > 0) {
            post.pdfs.forEach(pdf => this.addPdf(pdf.url, pdf.title, pdf.description));
        }
    }

    resetForm() {
        this.form.reset();
        document.getElementById('edit-post-id').value = '';
        document.getElementById('post-author').value = 'Les Omotani';
        document.getElementById('post-date').value = new Date().toISOString().split('T')[0];

        this.imagesContainer.innerHTML = '';
        this.videosContainer.innerHTML = '';
        this.pdfsContainer.innerHTML = '';
        this.imageCount = 0;
        this.videoCount = 0;
        this.pdfCount = 0;
        this.pendingUploads = [];
    }

    // ========================================
    // Media Management - Images
    // ========================================

    addImage(src = '', alt = '') {
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
            <div class="form-row">
                <div class="form-group">
                    <label for="image-file-${index}">Upload Image</label>
                    <div class="file-upload-wrapper">
                        <input type="file" id="image-file-${index}" name="image-file-${index}"
                               accept="image/jpeg,image/png,image/gif,image/webp"
                               class="file-input" data-preview-target="image-preview-${index}">
                        <div class="file-upload-btn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 11V3M8 3L5 6M8 3L11 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M2 11V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span>Choose File</span>
                        </div>
                        <span class="file-name" id="file-name-image-${index}">${src ? src.split('/').pop() : 'No file chosen'}</span>
                    </div>
                </div>
            </div>
            <div class="form-row two-col">
                <div class="form-group">
                    <label for="image-src-${index}">Image Path (or enter URL)</label>
                    <input type="text" id="image-src-${index}" name="image-src-${index}"
                           placeholder="images/news/filename.jpg" value="${src}"
                           data-preview-target="image-preview-${index}">
                </div>
                <div class="image-preview" id="image-preview-${index}">
                    ${src ? `<img src="${src}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=\\'image-preview-placeholder\\'>Image not found</span>'">` : '<span class="image-preview-placeholder">Image preview</span>'}
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="image-alt-${index}">Alt Text / Caption</label>
                    <input type="text" id="image-alt-${index}" name="image-alt-${index}"
                           placeholder="Describe the image" value="${alt}">
                </div>
            </div>
        `;

        this.imagesContainer.appendChild(imageItem);

        const removeBtn = imageItem.querySelector('[data-action="remove-image"]');
        removeBtn.addEventListener('click', () => this.removeMediaItem(imageItem, 'image'));

        const srcInput = imageItem.querySelector(`#image-src-${index}`);
        srcInput.addEventListener('input', (e) => this.updateImagePreview(e.target));

        const fileInput = imageItem.querySelector(`#image-file-${index}`);
        fileInput.addEventListener('change', (e) => this.handleImageUpload(e, index));
    }

    async handleImageUpload(event, index) {
        const file = event.target.files[0];
        if (!file) return;

        const fileNameSpan = document.getElementById(`file-name-image-${index}`);
        const srcInput = document.getElementById(`image-src-${index}`);
        const preview = document.getElementById(`image-preview-${index}`);

        // Update file name display
        fileNameSpan.textContent = file.name;

        // Show local preview
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;

            // Store for upload during publish
            this.pendingUploads.push({
                type: 'image',
                index: index,
                file: file,
                base64: e.target.result.split(',')[1], // Remove data:image... prefix
                mimeType: file.type,
                filename: file.name
            });

            // Clear the path input - will be set after upload
            srcInput.value = '';
            srcInput.placeholder = 'Will be set after upload...';
        };
        reader.readAsDataURL(file);
    }

    // ========================================
    // Media Management - Videos
    // ========================================

    addVideo(url = '', caption = '') {
        this.videoCount++;
        const index = this.videoCount;
        const embedUrl = this.getVideoEmbedUrl(url);

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
                           placeholder="https://www.youtube.com/watch?v=..." value="${url}"
                           data-preview-target="video-preview-${index}">
                    <small style="color: #666; font-size: 12px; margin-top: 4px;">YouTube or Vimeo</small>
                </div>
                <div class="video-preview" id="video-preview-${index}">
                    ${embedUrl ? `<iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>` : '<div class="video-preview-placeholder"><span>Video preview</span></div>'}
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="video-caption-${index}">Caption (optional)</label>
                    <input type="text" id="video-caption-${index}" name="video-caption-${index}"
                           placeholder="Video caption" value="${caption}">
                </div>
            </div>
        `;

        this.videosContainer.appendChild(videoItem);

        const removeBtn = videoItem.querySelector('[data-action="remove-video"]');
        removeBtn.addEventListener('click', () => this.removeMediaItem(videoItem, 'video'));

        const urlInput = videoItem.querySelector(`#video-url-${index}`);
        urlInput.addEventListener('input', (e) => this.updateVideoPreview(e.target));
    }

    // ========================================
    // Media Management - PDFs
    // ========================================

    addPdf(url = '', title = '', description = '') {
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
                    <label for="pdf-file-${index}">Upload PDF</label>
                    <div class="file-upload-wrapper">
                        <input type="file" id="pdf-file-${index}" name="pdf-file-${index}"
                               accept="application/pdf"
                               class="file-input">
                        <div class="file-upload-btn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 11V3M8 3L5 6M8 3L11 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M2 11V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span>Choose File</span>
                        </div>
                        <span class="file-name" id="file-name-pdf-${index}">${url ? url.split('/').pop() : 'No file chosen'}</span>
                    </div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="pdf-url-${index}">PDF URL (or enter external link)</label>
                    <input type="text" id="pdf-url-${index}" name="pdf-url-${index}"
                           placeholder="documents/news/document.pdf" value="${url}">
                </div>
            </div>
            <div class="form-row two-col">
                <div class="form-group">
                    <label for="pdf-title-${index}">Title *</label>
                    <input type="text" id="pdf-title-${index}" name="pdf-title-${index}"
                           placeholder="Document title" value="${title}">
                </div>
                <div class="form-group">
                    <label for="pdf-description-${index}">Description (optional)</label>
                    <input type="text" id="pdf-description-${index}" name="pdf-description-${index}"
                           placeholder="Brief description" value="${description}">
                </div>
            </div>
        `;

        this.pdfsContainer.appendChild(pdfItem);

        const removeBtn = pdfItem.querySelector('[data-action="remove-pdf"]');
        removeBtn.addEventListener('click', () => this.removeMediaItem(pdfItem, 'pdf'));

        const fileInput = pdfItem.querySelector(`#pdf-file-${index}`);
        fileInput.addEventListener('change', (e) => this.handlePdfUpload(e, index));
    }

    async handlePdfUpload(event, index) {
        const file = event.target.files[0];
        if (!file) return;

        const fileNameSpan = document.getElementById(`file-name-pdf-${index}`);
        const urlInput = document.getElementById(`pdf-url-${index}`);

        // Update file name display
        fileNameSpan.textContent = file.name;

        // Read file as base64
        const reader = new FileReader();
        reader.onload = (e) => {
            // Store for upload during publish
            this.pendingUploads.push({
                type: 'pdf',
                index: index,
                file: file,
                base64: e.target.result.split(',')[1],
                mimeType: file.type,
                filename: file.name
            });

            // Clear the URL input - will be set after upload
            urlInput.value = '';
            urlInput.placeholder = 'Will be set after upload...';
        };
        reader.readAsDataURL(file);
    }

    // ========================================
    // Media Helpers
    // ========================================

    removeMediaItem(item, type) {
        // Remove from pending uploads
        const index = parseInt(item.dataset.index);
        this.pendingUploads = this.pendingUploads.filter(u => !(u.type === type && u.index === index));

        item.remove();
        this.renumberItems(type);
    }

    renumberItems(type) {
        const container = type === 'image' ? this.imagesContainer :
                         type === 'video' ? this.videosContainer : this.pdfsContainer;
        const items = container.querySelectorAll('.media-item');

        items.forEach((item, idx) => {
            item.querySelector('.media-item-number').textContent =
                `${type.charAt(0).toUpperCase() + type.slice(1)} ${idx + 1}`;
        });
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
        const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
        const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        return null;
    }

    getVideoType(url) {
        if (!url) return null;
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('vimeo.com')) return 'vimeo';
        return null;
    }

    // ========================================
    // Data Collection
    // ========================================

    collectFormData() {
        const editId = document.getElementById('edit-post-id').value;
        const title = document.getElementById('post-title').value.trim();
        const date = document.getElementById('post-date').value;
        const category = document.getElementById('post-category').value;
        const author = document.getElementById('post-author').value.trim() || 'Les Omotani';
        const summary = document.getElementById('post-summary').value.trim();
        const content = document.getElementById('post-content').value.trim();

        // Generate ID
        const id = editId || this.generateId(title, date);

        // Collect images
        const images = [];
        this.imagesContainer.querySelectorAll('.media-item').forEach(item => {
            const srcInput = item.querySelector('input[id^="image-src-"]');
            const altInput = item.querySelector('input[id^="image-alt-"]');
            if (srcInput && srcInput.value.trim()) {
                images.push({
                    src: srcInput.value.trim(),
                    alt: altInput ? altInput.value.trim() : ''
                });
            }
        });

        // Featured video
        const featuredVideoUrl = document.getElementById('featured-video-url')?.value.trim();
        let featuredVideo = undefined;
        if (featuredVideoUrl) {
            featuredVideo = {
                url: featuredVideoUrl,
                embedUrl: this.getVideoEmbedUrl(featuredVideoUrl)
            };
        }

        // Collect videos
        const videos = [];
        this.videosContainer.querySelectorAll('.media-item').forEach(item => {
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
        this.pdfsContainer.querySelectorAll('.media-item').forEach(item => {
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
            image: images.length > 0 ? images[0].src : '',
            imageAlt: images.length > 0 ? images[0].alt : '',
            images: images.length > 1 ? images : undefined,
            featuredVideo: featuredVideo,
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
    // Publishing
    // ========================================

    async publishPost(e) {
        e.preventDefault();

        const title = document.getElementById('post-title').value.trim();
        const date = document.getElementById('post-date').value;
        const category = document.getElementById('post-category').value;
        const summary = document.getElementById('post-summary').value.trim();
        const content = document.getElementById('post-content').value.trim();

        if (!title || !date || !category || !summary || !content) {
            alert('Please fill in all required fields.');
            return;
        }

        // Show publishing modal
        this.showPublishingModal('Preparing to publish...');

        try {
            const postData = this.collectFormData();
            const postId = postData.id;

            // Upload pending files first
            if (this.pendingUploads.length > 0) {
                this.updatePublishingStatus('Uploading files...');

                for (let i = 0; i < this.pendingUploads.length; i++) {
                    const upload = this.pendingUploads[i];
                    this.updatePublishingStatus(`Uploading file ${i + 1} of ${this.pendingUploads.length}...`);

                    const result = await this.uploadFile(upload, postId);

                    if (result.success) {
                        // Update the form field with the uploaded path
                        if (upload.type === 'image') {
                            const srcInput = document.getElementById(`image-src-${upload.index}`);
                            if (srcInput) srcInput.value = result.path;
                        } else if (upload.type === 'pdf') {
                            const urlInput = document.getElementById(`pdf-url-${upload.index}`);
                            if (urlInput) urlInput.value = result.path;
                        }
                    } else {
                        throw new Error(`Failed to upload ${upload.filename}: ${result.error}`);
                    }
                }

                // Re-collect form data with updated paths
                Object.assign(postData, this.collectFormData());
            }

            // Clean up undefined values
            const cleanData = this.cleanObject(postData);

            // Save post via API
            this.updatePublishingStatus('Publishing post...');

            const action = this.editingPostId ? 'update' : 'create';
            const response = await fetch(`${this.apiBase}/save-post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: action,
                    post: cleanData,
                    postId: this.editingPostId
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to publish post');
            }

            // Success!
            this.updatePublishingStatus('Published successfully!', true);

            // Update local data
            if (action === 'create') {
                this.posts.unshift(cleanData);
            } else {
                const index = this.posts.findIndex(p => p.id === this.editingPostId);
                if (index !== -1) {
                    this.posts[index] = cleanData;
                }
            }
            this.filteredPosts = [...this.posts];

            // Return to dashboard after delay
            setTimeout(() => {
                this.closeAllModals();
                this.showDashboard();
                this.renderPostsTable();
            }, 2000);

        } catch (error) {
            console.error('Publish error:', error);
            this.updatePublishingStatus(`Error: ${error.message}`, false, true);
        }
    }

    async uploadFile(upload, postId) {
        try {
            const response = await fetch(`${this.apiBase}/upload-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: upload.base64,
                    filename: upload.filename,
                    mimeType: upload.mimeType,
                    postId: postId,
                    fileType: upload.type
                })
            });

            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    cleanObject(obj) {
        const clean = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined && value !== '' && value !== null) {
                if (Array.isArray(value) && value.length === 0) continue;
                clean[key] = value;
            }
        }
        return clean;
    }

    // ========================================
    // Publishing Modal
    // ========================================

    showPublishingModal(message) {
        this.publishingModal.hidden = false;
        document.body.style.overflow = 'hidden';

        // Reset modal state
        const spinnerEl = document.getElementById('publishing-spinner');
        const successIcon = document.getElementById('publishing-success-icon');
        const errorIcon = document.getElementById('publishing-error-icon');
        const closeBtn = document.getElementById('publishing-close-btn');

        spinnerEl.hidden = false;
        successIcon.hidden = true;
        errorIcon.hidden = true;
        closeBtn.hidden = true;

        this.updatePublishingStatus(message);
    }

    updatePublishingStatus(message, success = false, error = false) {
        const statusEl = document.getElementById('publishing-status');
        const spinnerEl = document.getElementById('publishing-spinner');
        const successIcon = document.getElementById('publishing-success-icon');
        const errorIcon = document.getElementById('publishing-error-icon');
        const closeBtn = document.getElementById('publishing-close-btn');

        statusEl.textContent = message;

        if (success) {
            statusEl.className = 'publishing-status success';
            spinnerEl.hidden = true;
            successIcon.hidden = false;
            errorIcon.hidden = true;
            closeBtn.hidden = true;
        } else if (error) {
            statusEl.className = 'publishing-status error';
            spinnerEl.hidden = true;
            successIcon.hidden = true;
            errorIcon.hidden = false;
            closeBtn.hidden = false; // Show close button on error
        } else {
            statusEl.className = 'publishing-status';
            spinnerEl.hidden = false;
            successIcon.hidden = true;
            errorIcon.hidden = true;
            closeBtn.hidden = true;
        }
    }

    // ========================================
    // Delete Post
    // ========================================

    showDeleteModal(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        this.deletePostId = postId;
        document.getElementById('delete-post-title').textContent = `Are you sure you want to delete "${post.title}"?`;

        this.deleteModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    closeDeleteModal() {
        this.deleteModal.hidden = true;
        document.body.style.overflow = '';
        this.deletePostId = null;
    }

    async confirmDelete() {
        if (!this.deletePostId) return;

        const postTitle = this.posts.find(p => p.id === this.deletePostId)?.title || 'Post';

        // Close delete modal and show publishing modal
        this.closeDeleteModal();
        this.showPublishingModal('Deleting post...');

        try {
            const response = await fetch(`${this.apiBase}/save-post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    postId: this.deletePostId
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete post');
            }

            // Success!
            this.updatePublishingStatus('Post deleted successfully!', true);

            // Update local data
            const index = this.posts.findIndex(p => p.id === this.deletePostId);
            if (index !== -1) {
                this.posts.splice(index, 1);
                this.filteredPosts = [...this.posts];
            }

            // Return to dashboard after delay
            setTimeout(() => {
                this.closeAllModals();
                this.renderPostsTable();
            }, 2000);

        } catch (error) {
            console.error('Delete error:', error);
            this.updatePublishingStatus(`Error: ${error.message}`, false, true);
        }
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

        let imagesHtml = '';
        const allImages = data.images || (data.image ? [{ src: data.image, alt: data.imageAlt }] : []);

        if (allImages.length > 0) {
            imagesHtml = `
                <div class="preview-carousel">
                    <div class="preview-carousel-images">
                        <img src="${allImages[0].src}" alt="${allImages[0].alt || ''}" class="active">
                    </div>
                    ${allImages[0].alt ? `<p class="preview-carousel-caption">${allImages[0].alt}</p>` : ''}
                </div>
            `;
        }

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
    }

    // ========================================
    // Modal Management
    // ========================================

    closeAllModals() {
        this.previewModal.hidden = true;
        this.deleteModal.hidden = true;
        if (this.publishingModal) this.publishingModal.hidden = true;
        document.body.style.overflow = '';
    }
}

// ============================================================
// Gallery Manager
// ============================================================

class GalleryManager {
    constructor() {
        this.galleryUrl = 'data/gallery.json?v=' + Date.now();
        this.apiBase = '/.netlify/functions';
        this.gallery = { categories: [], images: [] };
        this.filteredImages = [];
        this.editingImageId = null;
        this.deleteImageId = null;
        this.pendingUpload = null;

        // DOM Elements
        this.grid = document.getElementById('gallery-grid');
        this.filterSelect = document.getElementById('gallery-filter-category');
        this.editorModal = document.getElementById('gallery-editor-modal');
        this.deleteModal = document.getElementById('delete-gallery-modal');
        this.form = document.getElementById('gallery-image-form');

        this.init();
    }

    async init() {
        await this.loadGallery();
        this.renderGalleryGrid();
        this.setupEventListeners();
    }

    async loadGallery() {
        try {
            const response = await fetch(this.galleryUrl);
            if (!response.ok) throw new Error('Failed to load gallery');
            this.gallery = await response.json();
            this.filteredImages = [...this.gallery.images];
            this.populateCategoryFilter();
        } catch (error) {
            console.error('Error loading gallery:', error);
            this.gallery = { categories: [], images: [] };
            this.filteredImages = [];
        }
    }

    populateCategoryFilter() {
        // Keep "All Categories" option
        const allOption = this.filterSelect.querySelector('option[value="all"]');
        this.filterSelect.innerHTML = '';
        this.filterSelect.appendChild(allOption);

        // Add categories from data
        this.gallery.categories.forEach(cat => {
            if (cat.id !== 'all') {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.label;
                this.filterSelect.appendChild(option);
            }
        });
    }

    setupEventListeners() {
        // Add image button
        document.getElementById('add-gallery-image-btn').addEventListener('click', () => this.showEditor());

        // Filter
        this.filterSelect.addEventListener('change', (e) => this.filterByCategory(e.target.value));

        // Form
        this.form.addEventListener('submit', (e) => this.saveImage(e));
        document.getElementById('cancel-gallery-edit').addEventListener('click', () => this.closeEditor());

        // File input
        document.getElementById('gallery-image-file').addEventListener('change', (e) => this.handleFileSelect(e));

        // Image path input preview
        document.getElementById('gallery-image-src').addEventListener('input', (e) => this.updatePreview(e.target.value));

        // Delete modal
        document.getElementById('cancel-gallery-delete').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-gallery-delete').addEventListener('click', () => this.confirmDelete());

        // Close modals
        this.editorModal.querySelector('.modal-close').addEventListener('click', () => this.closeEditor());
        this.editorModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeEditor());
    }

    filterByCategory(category) {
        if (category === 'all') {
            this.filteredImages = [...this.gallery.images];
        } else {
            this.filteredImages = this.gallery.images.filter(img => img.category === category);
        }
        this.renderGalleryGrid();
    }

    renderGalleryGrid() {
        if (this.filteredImages.length === 0) {
            this.grid.innerHTML = '<div class="loading-message">No images found</div>';
            return;
        }

        this.grid.innerHTML = this.filteredImages.map(img => `
            <div class="admin-gallery-item" data-id="${img.id}" draggable="true">
                <img src="${img.src}" alt="${img.alt || ''}" loading="lazy">
                <div class="admin-gallery-item-overlay">
                    <div class="admin-gallery-item-category">${img.category}</div>
                    <div class="admin-gallery-item-caption">${img.caption}</div>
                    <div class="admin-gallery-item-actions">
                        <button type="button" class="btn-edit" data-action="edit" data-id="${img.id}">Edit</button>
                        <button type="button" class="btn-delete" data-action="delete" data-id="${img.id}">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners
        this.grid.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditor(btn.dataset.id);
            });
        });

        this.grid.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showDeleteModal(btn.dataset.id);
            });
        });

        // Drag and drop for reordering
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const items = this.grid.querySelectorAll('.admin-gallery-item');
        let draggedItem = null;

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                items.forEach(i => i.classList.remove('drag-over'));
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (item !== draggedItem) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');

                if (draggedItem && item !== draggedItem) {
                    const allItems = Array.from(this.grid.querySelectorAll('.admin-gallery-item'));
                    const fromIndex = allItems.indexOf(draggedItem);
                    const toIndex = allItems.indexOf(item);

                    // Reorder in DOM
                    if (fromIndex < toIndex) {
                        item.parentNode.insertBefore(draggedItem, item.nextSibling);
                    } else {
                        item.parentNode.insertBefore(draggedItem, item);
                    }

                    // Reorder in data
                    await this.saveReorder();
                }
            });
        });
    }

    async saveReorder() {
        const orderedIds = Array.from(this.grid.querySelectorAll('.admin-gallery-item'))
            .map(item => item.dataset.id);

        // Reorder images array
        const reorderedImages = [];
        orderedIds.forEach((id, index) => {
            const img = this.gallery.images.find(i => i.id === id);
            if (img) {
                img.order = index + 1;
                reorderedImages.push(img);
            }
        });

        this.gallery.images = reorderedImages;
        this.filteredImages = [...reorderedImages];

        // Save to server
        try {
            await fetch(`${this.apiBase}/save-gallery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reorder',
                    images: this.gallery.images
                })
            });
        } catch (error) {
            console.error('Failed to save reorder:', error);
        }
    }

    showEditor(imageId = null) {
        this.editingImageId = imageId;
        this.pendingUpload = null;

        const title = document.getElementById('gallery-editor-title');
        const idField = document.getElementById('gallery-image-id');
        const srcField = document.getElementById('gallery-image-src');
        const captionField = document.getElementById('gallery-image-caption');
        const altField = document.getElementById('gallery-image-alt');
        const categoryField = document.getElementById('gallery-image-category');
        const preview = document.getElementById('gallery-image-preview');
        const fileNameSpan = document.getElementById('gallery-file-name');

        if (imageId) {
            const image = this.gallery.images.find(img => img.id === imageId);
            if (image) {
                title.textContent = 'Edit Gallery Image';
                idField.value = imageId;
                srcField.value = image.src || '';
                captionField.value = image.caption || '';
                altField.value = image.alt || '';
                categoryField.value = image.category || '';
                preview.innerHTML = image.src
                    ? `<img src="${image.src}" alt="Preview">`
                    : '<span class="image-preview-placeholder">Image preview</span>';
                fileNameSpan.textContent = image.src ? image.src.split('/').pop() : 'No file chosen';
            }
        } else {
            title.textContent = 'Add Gallery Image';
            this.form.reset();
            idField.value = '';
            preview.innerHTML = '<span class="image-preview-placeholder">Image preview</span>';
            fileNameSpan.textContent = 'No file chosen';
        }

        this.editorModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    closeEditor() {
        this.editorModal.hidden = true;
        document.body.style.overflow = '';
        this.editingImageId = null;
        this.pendingUpload = null;
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const fileNameSpan = document.getElementById('gallery-file-name');
        const srcField = document.getElementById('gallery-image-src');
        const preview = document.getElementById('gallery-image-preview');

        fileNameSpan.textContent = file.name;

        const reader = new FileReader();
        reader.onload = (event) => {
            preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
            this.pendingUpload = {
                file: file,
                base64: event.target.result.split(',')[1],
                mimeType: file.type,
                filename: file.name
            };
            srcField.value = '';
            srcField.placeholder = 'Will be set after upload...';
        };
        reader.readAsDataURL(file);
    }

    updatePreview(src) {
        const preview = document.getElementById('gallery-image-preview');
        if (src) {
            preview.innerHTML = `<img src="${src}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=\\'image-preview-placeholder\\'>Image not found</span>'">`;
        } else {
            preview.innerHTML = '<span class="image-preview-placeholder">Image preview</span>';
        }
    }

    async saveImage(e) {
        e.preventDefault();

        const caption = document.getElementById('gallery-image-caption').value.trim();
        const category = document.getElementById('gallery-image-category').value;
        let src = document.getElementById('gallery-image-src').value.trim();
        const alt = document.getElementById('gallery-image-alt').value.trim();

        if (!caption || !category) {
            alert('Please fill in all required fields.');
            return;
        }

        // Show publishing modal
        const publishingModal = document.getElementById('publishing-modal');
        const publishingStatus = document.getElementById('publishing-status');
        const publishingSpinner = document.getElementById('publishing-spinner');

        publishingModal.hidden = false;
        publishingStatus.textContent = 'Saving...';
        publishingStatus.className = 'publishing-status';
        publishingSpinner.hidden = false;

        try {
            // Upload file if pending
            if (this.pendingUpload) {
                publishingStatus.textContent = 'Uploading image...';

                const response = await fetch(`${this.apiBase}/upload-file`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file: this.pendingUpload.base64,
                        filename: this.pendingUpload.filename,
                        mimeType: this.pendingUpload.mimeType,
                        postId: 'gallery',
                        fileType: 'image'
                    })
                });

                const result = await response.json();
                if (result.success) {
                    src = result.path;
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            }

            if (!src) {
                throw new Error('Please upload an image or enter a URL');
            }

            publishingStatus.textContent = 'Saving to gallery...';

            const imageData = {
                src,
                alt: alt || caption,
                caption,
                category,
                order: this.editingImageId
                    ? this.gallery.images.find(i => i.id === this.editingImageId)?.order || 999
                    : this.gallery.images.length + 1
            };

            const response = await fetch(`${this.apiBase}/save-gallery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: this.editingImageId ? 'update' : 'add',
                    image: imageData,
                    imageId: this.editingImageId
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to save');
            }

            // Success
            publishingStatus.textContent = 'Saved successfully!';
            publishingStatus.className = 'publishing-status success';
            publishingSpinner.hidden = true;

            // Update local data
            if (this.editingImageId) {
                const index = this.gallery.images.findIndex(i => i.id === this.editingImageId);
                if (index !== -1) {
                    this.gallery.images[index] = { ...this.gallery.images[index], ...imageData };
                }
            } else {
                this.gallery.images.push({ id: String(Date.now()), ...imageData });
            }
            this.filteredImages = [...this.gallery.images];

            setTimeout(() => {
                publishingModal.hidden = true;
                this.closeEditor();
                this.renderGalleryGrid();
            }, 1500);

        } catch (error) {
            console.error('Save error:', error);
            publishingStatus.textContent = `Error: ${error.message}`;
            publishingStatus.className = 'publishing-status error';
            publishingSpinner.hidden = true;
        }
    }

    showDeleteModal(imageId) {
        const image = this.gallery.images.find(img => img.id === imageId);
        if (!image) return;

        this.deleteImageId = imageId;
        document.getElementById('delete-gallery-title').textContent =
            `Are you sure you want to delete "${image.caption}"?`;

        this.deleteModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    closeDeleteModal() {
        this.deleteModal.hidden = true;
        document.body.style.overflow = '';
        this.deleteImageId = null;
    }

    async confirmDelete() {
        if (!this.deleteImageId) return;

        const publishingModal = document.getElementById('publishing-modal');
        const publishingStatus = document.getElementById('publishing-status');
        const publishingSpinner = document.getElementById('publishing-spinner');

        this.closeDeleteModal();
        publishingModal.hidden = false;
        publishingStatus.textContent = 'Deleting...';
        publishingStatus.className = 'publishing-status';
        publishingSpinner.hidden = false;

        try {
            const response = await fetch(`${this.apiBase}/save-gallery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    imageId: this.deleteImageId
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete');
            }

            publishingStatus.textContent = 'Deleted successfully!';
            publishingStatus.className = 'publishing-status success';
            publishingSpinner.hidden = true;

            // Update local data
            this.gallery.images = this.gallery.images.filter(i => i.id !== this.deleteImageId);
            this.filteredImages = [...this.gallery.images];

            setTimeout(() => {
                publishingModal.hidden = true;
                this.renderGalleryGrid();
            }, 1500);

        } catch (error) {
            console.error('Delete error:', error);
            publishingStatus.textContent = `Error: ${error.message}`;
            publishingStatus.className = 'publishing-status error';
            publishingSpinner.hidden = true;
        }
    }
}


// ============================================================
// Progress Manager
// ============================================================

class ProgressManager {
    constructor() {
        this.progressUrl = 'data/progress.json?v=' + Date.now();
        this.apiBase = '/.netlify/functions';
        this.goals = [];
        this.editingGoalId = null;
        this.deleteGoalId = null;
        this.barCount = 0;
        this.hasUnsavedChanges = false;

        // DOM Elements
        this.goalsList = document.getElementById('progress-goals-list');
        this.editorModal = document.getElementById('progress-editor-modal');
        this.deleteModal = document.getElementById('delete-progress-modal');
        this.form = document.getElementById('progress-goal-form');
        this.barsContainer = document.getElementById('progress-bars-container');

        this.init();
    }

    async init() {
        await this.loadProgress();
        this.renderGoalsList();
        this.setupEventListeners();
    }

    async loadProgress() {
        try {
            const response = await fetch(this.progressUrl);
            if (!response.ok) throw new Error('Failed to load progress');
            const data = await response.json();
            this.goals = data.goals || [];
        } catch (error) {
            console.error('Error loading progress:', error);
            this.goals = [];
        }
    }

    setupEventListeners() {
        // Add goal button
        document.getElementById('add-progress-goal-btn').addEventListener('click', () => this.showEditor());

        // Save all button
        document.getElementById('save-all-progress-btn').addEventListener('click', () => this.saveAllGoals());

        // Form
        this.form.addEventListener('submit', (e) => this.saveGoal(e));
        document.getElementById('cancel-progress-edit').addEventListener('click', () => this.closeEditor());

        // Add bar button
        document.getElementById('add-progress-bar-btn').addEventListener('click', () => this.addBar());

        // Delete modal
        document.getElementById('cancel-progress-delete').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-progress-delete').addEventListener('click', () => this.confirmDelete());

        // Close modals
        this.editorModal.querySelector('.modal-close').addEventListener('click', () => this.closeEditor());
        this.editorModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeEditor());
    }

    renderGoalsList() {
        if (this.goals.length === 0) {
            this.goalsList.innerHTML = '<div class="loading-message">No goals found</div>';
            return;
        }

        this.goalsList.innerHTML = this.goals.map((goal, index) => `
            <div class="progress-goal-card" data-id="${goal.id}" draggable="true">
                <div class="progress-goal-drag-handle">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4H6V6H4V4ZM10 4H12V6H10V4ZM4 7H6V9H4V7ZM10 7H12V9H10V7ZM4 10H6V12H4V10ZM10 10H12V12H10V10Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="progress-goal-info">
                    <h3 class="progress-goal-title">${goal.title}</h3>
                    <div class="progress-goal-bars-preview">
                        ${goal.bars.map(bar => `
                            <span class="bar-preview" style="background-color: ${bar.color}">
                                ${bar.label}: $${this.formatMoney(bar.value)}
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="progress-goal-actions">
                    <button type="button" class="btn-action btn-edit" data-action="edit" data-id="${goal.id}">Edit</button>
                    <button type="button" class="btn-action btn-delete" data-action="delete" data-id="${goal.id}">Delete</button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        this.goalsList.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => this.showEditor(btn.dataset.id));
        });

        this.goalsList.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => this.showDeleteModal(btn.dataset.id));
        });

        // Drag and drop
        this.setupDragAndDrop();
    }

    formatMoney(value) {
        if (value >= 1000) {
            return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + 'k';
        }
        return value.toString();
    }

    setupDragAndDrop() {
        const cards = this.goalsList.querySelectorAll('.progress-goal-card');
        let draggedCard = null;

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                draggedCard = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                cards.forEach(c => c.classList.remove('drag-over'));
                draggedCard = null;
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (card !== draggedCard) {
                    card.classList.add('drag-over');
                }
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');

                if (draggedCard && card !== draggedCard) {
                    const allCards = Array.from(this.goalsList.querySelectorAll('.progress-goal-card'));
                    const fromIndex = allCards.indexOf(draggedCard);
                    const toIndex = allCards.indexOf(card);

                    // Reorder in DOM
                    if (fromIndex < toIndex) {
                        card.parentNode.insertBefore(draggedCard, card.nextSibling);
                    } else {
                        card.parentNode.insertBefore(draggedCard, card);
                    }

                    // Reorder in data
                    this.reorderGoals();
                }
            });
        });
    }

    reorderGoals() {
        const orderedIds = Array.from(this.goalsList.querySelectorAll('.progress-goal-card'))
            .map(card => card.dataset.id);

        const reorderedGoals = [];
        orderedIds.forEach((id, index) => {
            const goal = this.goals.find(g => g.id === id);
            if (goal) {
                goal.order = index + 1;
                reorderedGoals.push(goal);
            }
        });

        this.goals = reorderedGoals;
        this.hasUnsavedChanges = true;
        this.updateSaveButton();
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('save-all-progress-btn');
        if (this.hasUnsavedChanges) {
            saveBtn.classList.add('btn-primary');
            saveBtn.classList.remove('btn-outline');
            saveBtn.textContent = 'Save All Changes *';
        } else {
            saveBtn.classList.remove('btn-primary');
            saveBtn.classList.add('btn-outline');
            saveBtn.textContent = 'Save All Changes';
        }
    }

    showEditor(goalId = null) {
        this.editingGoalId = goalId;
        this.barCount = 0;

        const title = document.getElementById('progress-editor-title');
        const idField = document.getElementById('progress-goal-id');
        const titleField = document.getElementById('progress-goal-title');
        const linkField = document.getElementById('progress-goal-link');

        this.barsContainer.innerHTML = '';

        if (goalId) {
            const goal = this.goals.find(g => g.id === goalId);
            if (goal) {
                title.textContent = 'Edit Goal';
                idField.value = goalId;
                titleField.value = goal.title || '';
                linkField.value = goal.link || '';

                // Load bars
                if (goal.bars && goal.bars.length > 0) {
                    goal.bars.forEach(bar => this.addBar(bar.label, bar.value, bar.color));
                } else {
                    this.addBar();
                }
            }
        } else {
            title.textContent = 'Add New Goal';
            this.form.reset();
            idField.value = '';
            // Add default bars
            this.addBar('Raised', '', '#e85a71');
            this.addBar('Goal', '', '#000000');
        }

        this.editorModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    closeEditor() {
        this.editorModal.hidden = true;
        document.body.style.overflow = '';
        this.editingGoalId = null;
    }

    addBar(label = '', value = '', color = '#e85a71') {
        this.barCount++;
        const index = this.barCount;

        const barItem = document.createElement('div');
        barItem.className = 'progress-bar-item';
        barItem.dataset.index = index;
        barItem.innerHTML = `
            <div class="progress-bar-item-header">
                <span class="progress-bar-item-number">Bar ${index}</span>
                <button type="button" class="media-item-remove" data-action="remove-bar">Remove</button>
            </div>
            <div class="form-row three-col">
                <div class="form-group">
                    <label for="bar-label-${index}">Label *</label>
                    <input type="text" id="bar-label-${index}" required placeholder="Raised $34k" value="${label}">
                </div>
                <div class="form-group">
                    <label for="bar-value-${index}">Value ($) *</label>
                    <input type="number" id="bar-value-${index}" required placeholder="34000" value="${value}">
                </div>
                <div class="form-group">
                    <label for="bar-color-${index}">Color</label>
                    <div class="color-input-wrapper">
                        <input type="color" id="bar-color-${index}" value="${color}">
                        <input type="text" id="bar-color-text-${index}" value="${color}" placeholder="#e85a71">
                    </div>
                </div>
            </div>
        `;

        this.barsContainer.appendChild(barItem);

        const removeBtn = barItem.querySelector('[data-action="remove-bar"]');
        removeBtn.addEventListener('click', () => this.removeBar(barItem));

        // Sync color inputs
        const colorPicker = barItem.querySelector(`#bar-color-${index}`);
        const colorText = barItem.querySelector(`#bar-color-text-${index}`);
        colorPicker.addEventListener('input', () => { colorText.value = colorPicker.value; });
        colorText.addEventListener('input', () => {
            if (/^#[0-9A-Fa-f]{6}$/.test(colorText.value)) {
                colorPicker.value = colorText.value;
            }
        });
    }

    removeBar(barItem) {
        barItem.remove();
        this.renumberBars();
    }

    renumberBars() {
        const bars = this.barsContainer.querySelectorAll('.progress-bar-item');
        bars.forEach((bar, idx) => {
            bar.querySelector('.progress-bar-item-number').textContent = `Bar ${idx + 1}`;
        });
    }

    collectBars() {
        const bars = [];
        this.barsContainer.querySelectorAll('.progress-bar-item').forEach(item => {
            const index = item.dataset.index;
            const label = document.getElementById(`bar-label-${index}`).value.trim();
            const value = parseInt(document.getElementById(`bar-value-${index}`).value) || 0;
            const color = document.getElementById(`bar-color-${index}`).value;

            if (label && value > 0) {
                bars.push({ label, value, color });
            }
        });
        return bars;
    }

    async saveGoal(e) {
        e.preventDefault();

        const title = document.getElementById('progress-goal-title').value.trim();
        const link = document.getElementById('progress-goal-link').value.trim();
        const bars = this.collectBars();

        if (!title) {
            alert('Please enter a goal title.');
            return;
        }

        if (bars.length === 0) {
            alert('Please add at least one bar with a label and value.');
            return;
        }

        const goalData = {
            title,
            link,
            bars,
            order: this.editingGoalId
                ? this.goals.find(g => g.id === this.editingGoalId)?.order || 999
                : this.goals.length + 1
        };

        // Update local data
        if (this.editingGoalId) {
            const index = this.goals.findIndex(g => g.id === this.editingGoalId);
            if (index !== -1) {
                this.goals[index] = { ...this.goals[index], ...goalData };
            }
        } else {
            this.goals.push({ id: String(Date.now()), ...goalData });
        }

        this.hasUnsavedChanges = true;
        this.updateSaveButton();
        this.closeEditor();
        this.renderGoalsList();
    }

    async saveAllGoals() {
        const publishingModal = document.getElementById('publishing-modal');
        const publishingStatus = document.getElementById('publishing-status');
        const publishingSpinner = document.getElementById('publishing-spinner');

        publishingModal.hidden = false;
        publishingStatus.textContent = 'Saving progress goals...';
        publishingStatus.className = 'publishing-status';
        publishingSpinner.hidden = false;

        try {
            const response = await fetch(`${this.apiBase}/save-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save-all',
                    goals: this.goals
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to save');
            }

            publishingStatus.textContent = 'Progress goals saved successfully!';
            publishingStatus.className = 'publishing-status success';
            publishingSpinner.hidden = true;

            this.hasUnsavedChanges = false;
            this.updateSaveButton();

            setTimeout(() => {
                publishingModal.hidden = true;
            }, 1500);

        } catch (error) {
            console.error('Save error:', error);
            publishingStatus.textContent = `Error: ${error.message}`;
            publishingStatus.className = 'publishing-status error';
            publishingSpinner.hidden = true;
        }
    }

    showDeleteModal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        this.deleteGoalId = goalId;
        document.getElementById('delete-progress-title').textContent =
            `Are you sure you want to delete "${goal.title}"?`;

        this.deleteModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    closeDeleteModal() {
        this.deleteModal.hidden = true;
        document.body.style.overflow = '';
        this.deleteGoalId = null;
    }

    confirmDelete() {
        if (!this.deleteGoalId) return;

        this.goals = this.goals.filter(g => g.id !== this.deleteGoalId);
        this.hasUnsavedChanges = true;
        this.updateSaveButton();

        this.closeDeleteModal();
        this.renderGoalsList();
    }
}


// ============================================================
// Tab Navigation
// ============================================================

function setupTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const tabContents = {
        posts: document.getElementById('posts-tab'),
        gallery: document.getElementById('gallery-tab'),
        progress: document.getElementById('progress-tab')
    };

    function showTab(tabName) {
        // Update tab buttons
        tabs.forEach(t => {
            if (t.dataset.tab === tabName) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // Update tab contents
        Object.keys(tabContents).forEach(key => {
            if (tabContents[key]) {
                tabContents[key].hidden = key !== tabName;
            }
        });
    }

    // Set up click handlers
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            showTab(tab.dataset.tab);
        });
    });

    // Initialize: show posts tab by default
    showTab('posts');
}


// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    new AdminDashboard();
    new GalleryManager();
    new ProgressManager();
});
