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
            // Fetch posts from Supabase
            const dbPosts = await postsAPI.getAll();

            // Transform snake_case database fields to camelCase for admin
            this.posts = dbPosts.map(post => ({
                id: post.id,
                title: post.title,
                date: post.date,
                year: post.year,
                category: post.category,
                author: post.author,
                image: post.image,
                imageAlt: post.image_alt,
                summary: post.summary,
                content: post.content,
                images: typeof post.images === 'string' ? JSON.parse(post.images) : (post.images || []),
                videos: typeof post.videos === 'string' ? JSON.parse(post.videos) : (post.videos || []),
                pdfs: typeof post.pdfs === 'string' ? JSON.parse(post.pdfs) : (post.pdfs || []),
                featuredVideo: post.featured_video
            }));

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

        // Featured video preview
        const featuredVideoInput = document.getElementById('featured-video-url');
        if (featuredVideoInput) {
            featuredVideoInput.addEventListener('input', () => this.updateFeaturedVideoPreview());
        }

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
            // Update the preview
            this.updateFeaturedVideoPreview();
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

        // Reset featured video preview
        this.updateFeaturedVideoPreview();
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

        // Make the custom button trigger the hidden file input
        const fileUploadBtn = imageItem.querySelector('.file-upload-btn');
        fileUploadBtn.addEventListener('click', () => fileInput.click());
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

        // Make the custom button trigger the hidden file input
        const fileUploadBtn = pdfItem.querySelector('.file-upload-btn');
        fileUploadBtn.addEventListener('click', () => fileInput.click());
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

    updateFeaturedVideoPreview() {
        const input = document.getElementById('featured-video-url');
        const preview = document.getElementById('featured-video-preview');
        if (!input || !preview) return;

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

    getVideoThumbnail(url) {
        if (!url) return null;
        // YouTube thumbnail
        const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (youtubeMatch) {
            // Use hqdefault which is always available (maxresdefault may not exist for all videos)
            return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
        }
        // Vimeo requires API call, so we can't easily get thumbnail
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
            image: images.length > 0 ? images[0].src : null,
            imageAlt: images.length > 0 ? images[0].alt : '',
            images: images.length > 0 ? images : [],
            featuredVideo: featuredVideo,
            videos: videos.length > 0 ? videos : [],
            pdfs: pdfs.length > 0 ? pdfs : [],
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

            // Save post directly to Supabase (instant update!)
            this.updatePublishingStatus('Publishing post...');

            // Get featured video URL
            const featuredVideoUrl = cleanData.featuredVideo?.url || cleanData.featuredVideo || null;

            // Get images array (use postData since cleanObject may have removed empty arrays)
            const imagesArray = postData.images || [];

            // Get primary image from images array or cleanData.image
            let postImage = imagesArray.length > 0 ? imagesArray[0].src : (cleanData.image || null);

            // Auto-generate thumbnail from YouTube video if no image provided
            if (!postImage && featuredVideoUrl) {
                postImage = this.getVideoThumbnail(featuredVideoUrl);
            }

            // Transform camelCase to snake_case for database
            const dbPost = {
                title: cleanData.title,
                date: cleanData.date,
                year: cleanData.year || new Date(cleanData.date).getFullYear(),
                category: cleanData.category,
                author: cleanData.author || 'Les Omotani',
                image: postImage,
                image_alt: imagesArray.length > 0 ? (imagesArray[0].alt || cleanData.title) : (cleanData.title || null),
                summary: cleanData.summary,
                content: cleanData.content,
                images: JSON.stringify(imagesArray),
                videos: JSON.stringify(postData.videos || []),
                pdfs: JSON.stringify(postData.pdfs || []),
                featured_video: featuredVideoUrl
            };

            if (this.editingPostId) {
                await postsAPI.update(this.editingPostId, dbPost);
            } else {
                // Include id only for new posts
                dbPost.id = cleanData.id;
                await postsAPI.create(dbPost);
            }

            // Success!
            this.updatePublishingStatus('Published successfully!', true);

            // Update local data
            if (!this.editingPostId) {
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
            // Check file size before upload - Netlify has ~6MB request body limit
            // Base64 adds ~33% overhead, so ~4.5MB file becomes ~6MB payload
            const fileSizeMB = (upload.base64.length * 0.75) / (1024 * 1024);
            if (fileSizeMB > 4.5) {
                return {
                    success: false,
                    error: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ~4.5MB due to upload limits. Please compress the PDF or use a smaller file.`
                };
            }

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

            // Check if response is OK before parsing
            const text = await response.text();
            if (!text) {
                return { success: false, error: 'Empty response from server. The file may be too large.' };
            }

            try {
                return JSON.parse(text);
            } catch (e) {
                // Non-JSON response (likely Netlify error page)
                console.error('Non-JSON response:', text.substring(0, 500));
                return { success: false, error: 'Server error. The file may be too large or there was a network issue.' };
            }
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
            // Delete directly from Supabase (instant!)
            await postsAPI.delete(this.deletePostId);

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
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
            const day = date.getDate();
            const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                          day === 2 || day === 22 ? 'nd' :
                          day === 3 || day === 23 ? 'rd' : 'th';
            return `${months[date.getMonth()]} ${day}${suffix}, ${date.getFullYear()}`;
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

        // Check for featured video first
        let featuredMediaHtml = '';
        const featuredVideoUrl = data.featuredVideo?.url || data.featuredVideo;
        if (featuredVideoUrl) {
            const embedUrl = this.getVideoEmbedUrl(featuredVideoUrl);
            if (embedUrl) {
                featuredMediaHtml = `
                    <div class="preview-featured-video">
                        <div class="preview-video-embed">
                            <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
                        </div>
                        ${data.featuredVideo?.caption ? `<p class="preview-video-caption">${data.featuredVideo.caption}</p>` : ''}
                    </div>
                `;
            }
        }

        // If no featured video, show images
        let imagesHtml = '';
        if (!featuredMediaHtml) {
            const allImages = (data.images && data.images.length > 0)
                ? data.images
                : (data.image ? [{ src: data.image, alt: data.imageAlt }] : []);

            if (allImages.length > 0 && allImages[0].src) {
                imagesHtml = `
                    <div class="preview-carousel">
                        <div class="preview-carousel-images">
                            <img src="${allImages[0].src}" alt="${allImages[0].alt || ''}" class="active">
                        </div>
                        ${allImages[0].alt ? `<p class="preview-carousel-caption">${allImages[0].alt}</p>` : ''}
                    </div>
                `;
            }
        }

        let videosHtml = '';
        if (data.videos && data.videos.length > 0) {
            videosHtml = `
                <div class="preview-videos">
                    ${data.videos.map(video => {
                        const embedUrl = video.embedUrl || this.getVideoEmbedUrl(video.url);
                        return `
                            <div class="preview-video-item">
                                <div class="preview-video-embed">
                                    <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
                                </div>
                                ${video.caption ? `<p class="preview-video-caption">${video.caption}</p>` : ''}
                            </div>
                        `;
                    }).join('')}
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
                                <p class="preview-pdf-title">${pdf.title || 'PDF Document'}</p>
                                ${pdf.description ? `<p class="preview-pdf-description">${pdf.description}</p>` : ''}
                            </div>
                            <span class="preview-pdf-download">Download</span>
                        </a>
                    `).join('')}
                </div>
            `;
        }

        // Match post.html layout order: meta (date/author/category) -> title -> media -> content
        this.previewContainer.innerHTML = `
            <div class="preview-meta">
                <span class="preview-date">${formatDate(data.date)}</span>
                <span class="preview-author">By ${data.author}</span>
                <div class="preview-category-badge">${data.category || 'Category'}</div>
            </div>
            <h1 class="preview-title">${data.title || 'Post Title'}</h1>
            ${featuredMediaHtml}
            ${imagesHtml}
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
        try {
            await this.loadGallery();
            this.renderGalleryGrid();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing GalleryManager:', error);
        }
    }

    async loadGallery() {
        // Note: Gallery management is now handled by GalleryAdmin in gallery-admin.js
        // This legacy GalleryManager is kept for backwards compatibility but doesn't load data
        this.gallery = { categories: [], images: [] };
        this.filteredImages = [];
    }

    populateCategoryFilter() {
        if (!this.filterSelect) return;

        // Keep "All Categories" option
        const allOption = this.filterSelect.querySelector('option[value="all"]');
        this.filterSelect.innerHTML = '';
        if (allOption) this.filterSelect.appendChild(allOption);

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
        const addBtn = document.getElementById('add-gallery-image-btn');
        if (addBtn) addBtn.addEventListener('click', () => this.showEditor());

        // Filter
        if (this.filterSelect) {
            this.filterSelect.addEventListener('change', (e) => this.filterByCategory(e.target.value));
        }

        // Form
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.saveImage(e));
        }
        const cancelBtn = document.getElementById('cancel-gallery-edit');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeEditor());

        // File input
        const galleryFileInput = document.getElementById('gallery-image-file');
        if (galleryFileInput) {
            galleryFileInput.addEventListener('change', (e) => this.handleFileSelect(e));

            // Make the custom button trigger the hidden file input
            if (this.editorModal) {
                const galleryFileBtn = this.editorModal.querySelector('.file-upload-btn');
                if (galleryFileBtn) galleryFileBtn.addEventListener('click', () => galleryFileInput.click());
            }
        }

        // Image path input preview
        const srcInput = document.getElementById('gallery-image-src');
        if (srcInput) srcInput.addEventListener('input', (e) => this.updatePreview(e.target.value));

        // Delete modal
        const cancelDeleteBtn = document.getElementById('cancel-gallery-delete');
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        const confirmDeleteBtn = document.getElementById('confirm-gallery-delete');
        if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());

        // Close modals
        if (this.editorModal) {
            const closeBtn = this.editorModal.querySelector('.modal-close');
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeEditor());
            const backdrop = this.editorModal.querySelector('.modal-backdrop');
            if (backdrop) backdrop.addEventListener('click', () => this.closeEditor());
        }
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
        if (!this.grid) {
            console.warn('Gallery grid element not found');
            return;
        }
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

        // Save to Supabase - update sort_order for each image
        try {
            for (const img of reorderedImages) {
                await galleryAPI.updateImage(img.id, { sort_order: img.order });
            }
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

            // Transform to Supabase schema
            const dbImage = {
                src,
                alt: alt || caption,
                caption,
                category,
                sort_order: this.editingImageId
                    ? this.gallery.images.find(i => i.id === this.editingImageId)?.order || 999
                    : this.gallery.images.length + 1
            };

            // Save directly to Supabase (instant!)
            if (this.editingImageId) {
                await galleryAPI.updateImage(this.editingImageId, dbImage);
            } else {
                dbImage.id = `img-${Date.now()}`;
                await galleryAPI.createImage(dbImage);
            }

            // Create local imageData for UI update
            const imageData = {
                id: this.editingImageId || dbImage.id,
                src,
                alt: alt || caption,
                caption,
                category,
                order: dbImage.sort_order
            };

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
            // Delete directly from Supabase (instant!)
            await galleryAPI.deleteImage(this.deleteImageId);

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
// Progress Manager (Simplified Structure)
// ============================================================

class ProgressManager {
    constructor() {
        this.apiBase = '/.netlify/functions';
        this.goals = [];
        this.editingGoalId = null;
        this.deleteGoalId = null;
        this.goalItemCount = 0;
        this.hasUnsavedChanges = false;

        // DOM Elements
        this.goalsList = document.getElementById('progress-goals-list');
        this.editorModal = document.getElementById('progress-editor-modal');
        this.deleteModal = document.getElementById('delete-progress-modal');
        this.form = document.getElementById('progress-goal-form');
        this.goalsContainer = document.getElementById('progress-goals-container');

        this.init();
    }

    async init() {
        await this.loadProgress();
        this.renderGoalsList();
        this.setupEventListeners();
    }

    async loadProgress() {
        try {
            const dbGoals = await progressAPI.getGoals();
            this.goals = dbGoals.map(goal => {
                // Parse the new structure
                const data = {
                    id: goal.id,
                    label: goal.label || '',
                    title: goal.title,
                    link: goal.link,
                    order: goal.sort_order
                };

                // Parse goals array (new structure)
                if (goal.goals) {
                    data.goals = typeof goal.goals === 'string' ? JSON.parse(goal.goals) : goal.goals;
                } else {
                    data.goals = [];
                }

                // Parse donations (new structure)
                if (goal.donations) {
                    data.donations = typeof goal.donations === 'string' ? JSON.parse(goal.donations) : goal.donations;
                } else {
                    data.donations = { value: 0, color: '#e85a71' };
                }

                // Backwards compatibility: convert old bars/markers to new structure
                if (data.goals.length === 0 && goal.bars) {
                    const bars = typeof goal.bars === 'string' ? JSON.parse(goal.bars) : goal.bars;
                    const markers = goal.markers ? (typeof goal.markers === 'string' ? JSON.parse(goal.markers) : goal.markers) : [];

                    // Find donations bar (usually "Raised")
                    const raisedBar = bars.find(b => b.label && b.label.toLowerCase().includes('raised'));
                    if (raisedBar) {
                        data.donations = {
                            value: raisedBar.value,
                            color: raisedBar.color || '#e85a71',
                            markerEnabled: false
                        };
                    }

                    // Convert other bars to goals
                    bars.forEach(bar => {
                        if (!bar.label.toLowerCase().includes('raised')) {
                            const matchingMarker = markers.find(m => m.value === bar.value);
                            data.goals.push({
                                name: bar.label,
                                value: bar.value,
                                barLabel: bar.label,
                                barColor: bar.color || '#F5E4AF',
                                markerEnabled: !!matchingMarker,
                                markerColor: matchingMarker?.color || bar.color || '#312121',
                                markerTextColor: matchingMarker?.textColor || '#F5E4AF'
                            });
                        }
                    });
                }

                return data;
            });
        } catch (error) {
            console.error('Error loading progress:', error);
            this.goals = [];
        }
    }

    setupEventListeners() {
        // Add new progress card button (in the list)
        const addBtn = document.getElementById('add-progress-goal-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showEditor());
        }

        // Save all button
        document.getElementById('save-all-progress-btn').addEventListener('click', () => this.saveAllGoals());

        // Form
        this.form.addEventListener('submit', (e) => this.saveGoal(e));
        document.getElementById('cancel-progress-edit').addEventListener('click', () => this.closeEditor());

        // Add goal item button (inside editor)
        const addGoalBtn = document.getElementById('add-progress-goal-btn');
        if (addGoalBtn) {
            // This is now in the editor form - add goal target
        }

        // Delete modal
        document.getElementById('cancel-progress-delete').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-progress-delete').addEventListener('click', () => this.confirmDelete());

        // Close modals
        this.editorModal.querySelector('.modal-close').addEventListener('click', () => this.closeEditor());
        this.editorModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeEditor());

        // Donations color sync
        this.setupColorSync('donations-color', 'donations-color-text');
        this.setupColorSync('donations-marker-color', 'donations-marker-color-text');
        this.setupColorSync('donations-marker-text-color', 'donations-marker-text-color-text');

        // Donations marker toggle
        const donationsMarkerCheckbox = document.getElementById('donations-marker-enabled');
        if (donationsMarkerCheckbox) {
            donationsMarkerCheckbox.addEventListener('change', () => {
                const colorsDiv = document.getElementById('donations-marker-colors');
                colorsDiv.style.opacity = donationsMarkerCheckbox.checked ? '1' : '0.5';
            });
        }
    }

    setupColorSync(pickerId, textId) {
        const picker = document.getElementById(pickerId);
        const text = document.getElementById(textId);
        if (picker && text) {
            picker.addEventListener('input', () => { text.value = picker.value; });
            text.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(text.value)) {
                    picker.value = text.value;
                }
            });
        }
    }

    renderGoalsList() {
        if (this.goals.length === 0) {
            this.goalsList.innerHTML = '<div class="loading-message">No goals found</div>';
            return;
        }

        this.goalsList.innerHTML = this.goals.map((goal) => {
            const donations = goal.donations || {};
            const goalItems = goal.goals || [];

            return `
            <div class="progress-goal-card" data-id="${goal.id}" draggable="true">
                <div class="progress-goal-drag-handle">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4H6V6H4V4ZM10 4H12V6H10V4ZM4 7H6V9H4V7ZM10 7H12V9H10V7ZM4 10H6V12H4V10ZM10 10H12V12H10V10Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="progress-goal-info">
                    <h3 class="progress-goal-title">${goal.label ? goal.label + ' ' : ''}${goal.title}</h3>
                    <div class="progress-goal-bars-preview">
                        ${goalItems.map(g => `
                            <span class="bar-preview" style="background-color: ${g.barColor || '#F5E4AF'}">
                                ${g.barLabel || g.name}: $${this.formatMoney(g.value)}
                            </span>
                        `).join('')}
                        <span class="bar-preview" style="background-color: ${donations.color || '#e85a71'}">
                            Donations: $${this.formatMoney(donations.value || 0)}
                        </span>
                    </div>
                    ${goalItems.some(g => g.markerEnabled) || donations.markerEnabled ? `
                    <div class="progress-goal-markers-preview">
                        ${goalItems.filter(g => g.markerEnabled).map(g => `
                            <span class="marker-preview" style="background-color: ${g.markerColor || '#312121'}; color: ${g.markerTextColor || '#F5E4AF'}">
                                ▸ ${g.barLabel || g.name}: $${this.formatMoney(g.value)}
                            </span>
                        `).join('')}
                        ${donations.markerEnabled ? `
                            <span class="marker-preview" style="background-color: ${donations.markerColor || '#e85a71'}; color: ${donations.markerTextColor || '#f7f7f7'}">
                                ▸ Donations: $${this.formatMoney(donations.value || 0)}
                            </span>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
                <div class="progress-goal-actions">
                    <button type="button" class="btn-action btn-edit" data-action="edit" data-id="${goal.id}">Edit</button>
                    <button type="button" class="btn-action btn-delete" data-action="delete" data-id="${goal.id}">Delete</button>
                </div>
            </div>
        `;
        }).join('');

        // Add event listeners
        this.goalsList.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => this.showEditor(btn.dataset.id));
        });

        this.goalsList.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => this.showDeleteModal(btn.dataset.id));
        });

        this.setupDragAndDrop();
    }

    formatMoney(value) {
        if (!value) return '0';
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

                    if (fromIndex < toIndex) {
                        card.parentNode.insertBefore(draggedCard, card.nextSibling);
                    } else {
                        card.parentNode.insertBefore(draggedCard, card);
                    }

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
        const btnText = saveBtn.querySelector('.btn-text');
        if (this.hasUnsavedChanges) {
            saveBtn.classList.add('btn-primary');
            saveBtn.classList.remove('btn-outline');
            if (btnText) btnText.textContent = 'Publish Changes *';
        } else {
            saveBtn.classList.remove('btn-primary');
            saveBtn.classList.add('btn-outline');
            if (btnText) btnText.textContent = 'Publish Changes';
        }
    }

    showEditor(goalId = null) {
        this.editingGoalId = goalId;
        this.goalItemCount = 0;

        const editorTitle = document.getElementById('progress-editor-title');
        const idField = document.getElementById('progress-goal-id');
        const labelField = document.getElementById('progress-goal-label');
        const titleField = document.getElementById('progress-goal-title');
        const linkField = document.getElementById('progress-goal-link');

        // Clear goals container
        if (this.goalsContainer) {
            this.goalsContainer.innerHTML = '';
        }

        // Setup add goal button
        const addGoalBtn = document.querySelector('#add-progress-goal-btn');
        if (addGoalBtn && !addGoalBtn._listenerAdded) {
            addGoalBtn.addEventListener('click', () => this.addGoalItem());
            addGoalBtn._listenerAdded = true;
        }

        if (goalId) {
            const goal = this.goals.find(g => g.id === goalId);
            if (goal) {
                editorTitle.textContent = 'Edit Goal';
                idField.value = goalId;
                labelField.value = goal.label || '';
                titleField.value = goal.title || '';
                linkField.value = goal.link || '';

                // Load goal items
                if (goal.goals && goal.goals.length > 0) {
                    goal.goals.forEach(g => this.addGoalItem(g));
                } else {
                    this.addGoalItem();
                }

                // Load donations
                const donations = goal.donations || {};
                document.getElementById('donations-value').value = donations.value || '';
                document.getElementById('donations-color').value = donations.color || '#e85a71';
                document.getElementById('donations-color-text').value = donations.color || '#e85a71';
                document.getElementById('donations-marker-enabled').checked = donations.markerEnabled || false;
                document.getElementById('donations-marker-color').value = donations.markerColor || '#e85a71';
                document.getElementById('donations-marker-color-text').value = donations.markerColor || '#e85a71';
                document.getElementById('donations-marker-text-color').value = donations.markerTextColor || '#f7f7f7';
                document.getElementById('donations-marker-text-color-text').value = donations.markerTextColor || '#f7f7f7';

                // Load donations gradient values
                const isGradient = donations.gradientColor1 && donations.gradientColor2;
                document.getElementById('donations-use-gradient').value = isGradient ? '1' : '0';
                document.getElementById('donations-gradient-color1').value = donations.gradientColor1 || '#e85a71';
                document.getElementById('donations-gradient-color1-text').value = donations.gradientColor1 || '#e85a71';
                document.getElementById('donations-gradient-color2').value = donations.gradientColor2 || '#c44a5f';
                document.getElementById('donations-gradient-color2-text').value = donations.gradientColor2 || '#c44a5f';

                // Update gradient picker UI
                const gradientPicker = document.getElementById('donations-gradient-picker');
                const solidPicker = gradientPicker.querySelector('.gradient-solid-picker');
                const gradientColorsPicker = gradientPicker.querySelector('.gradient-colors-picker');
                const toggleBtns = gradientPicker.querySelectorAll('.gradient-type-toggle button');
                toggleBtns.forEach(btn => btn.classList.remove('active'));
                if (isGradient) {
                    toggleBtns[1].classList.add('active');
                    solidPicker.classList.remove('active');
                    gradientColorsPicker.classList.add('active');
                } else {
                    toggleBtns[0].classList.add('active');
                    solidPicker.classList.add('active');
                    gradientColorsPicker.classList.remove('active');
                }
                document.getElementById('donations-gradient-preview').style.background =
                    `linear-gradient(to bottom, ${donations.gradientColor1 || '#e85a71'}, ${donations.gradientColor2 || '#c44a5f'})`;

                // Update marker colors visibility
                const colorsDiv = document.getElementById('donations-marker-colors');
                colorsDiv.style.opacity = donations.markerEnabled ? '1' : '0.5';
            }
        } else {
            editorTitle.textContent = 'Add New Goal';
            this.form.reset();
            idField.value = '';

            // Reset donations defaults
            document.getElementById('donations-color').value = '#e85a71';
            document.getElementById('donations-color-text').value = '#e85a71';
            document.getElementById('donations-marker-color').value = '#e85a71';
            document.getElementById('donations-marker-color-text').value = '#e85a71';
            document.getElementById('donations-marker-text-color').value = '#f7f7f7';
            document.getElementById('donations-marker-text-color-text').value = '#f7f7f7';
            document.getElementById('donations-marker-colors').style.opacity = '0.5';

            // Reset donations gradient defaults
            document.getElementById('donations-use-gradient').value = '0';
            document.getElementById('donations-gradient-color1').value = '#e85a71';
            document.getElementById('donations-gradient-color1-text').value = '#e85a71';
            document.getElementById('donations-gradient-color2').value = '#c44a5f';
            document.getElementById('donations-gradient-color2-text').value = '#c44a5f';
            const gradientPicker = document.getElementById('donations-gradient-picker');
            const solidPicker = gradientPicker.querySelector('.gradient-solid-picker');
            const gradientColorsPicker = gradientPicker.querySelector('.gradient-colors-picker');
            const toggleBtns = gradientPicker.querySelectorAll('.gradient-type-toggle button');
            toggleBtns.forEach(btn => btn.classList.remove('active'));
            toggleBtns[0].classList.add('active');
            solidPicker.classList.add('active');
            gradientColorsPicker.classList.remove('active');
            document.getElementById('donations-gradient-preview').style.background =
                'linear-gradient(to bottom, #e85a71, #c44a5f)';

            // Add default goal
            this.addGoalItem({ name: 'Goal', value: '', barLabel: 'Goal', barColor: '#F5E4AF', markerEnabled: true, markerColor: '#312121', markerTextColor: '#F5E4AF' });
        }

        // Setup donations gradient picker event listeners
        this.setupDonationsGradientPicker();

        this.editorModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    addGoalItem(data = {}) {
        if (!this.goalsContainer) return;

        this.goalItemCount++;
        const index = this.goalItemCount;

        const item = document.createElement('div');
        item.className = 'progress-goal-item';
        item.dataset.index = index;

        const markerEnabled = data.markerEnabled || false;

        item.innerHTML = `
            <div class="progress-goal-item-header">
                <span class="progress-goal-item-number">Goal ${index}</span>
                <button type="button" class="media-item-remove" data-action="remove-goal-item">Remove</button>
            </div>
            <div class="form-row two-col">
                <div class="form-group">
                    <label for="goal-name-${index}">Goal Name *</label>
                    <input type="text" id="goal-name-${index}" placeholder="Phase 1 (Batwa Farm)" value="${data.name || ''}">
                </div>
                <div class="form-group">
                    <label for="goal-value-${index}">Value ($) *</label>
                    <input type="number" id="goal-value-${index}" placeholder="27000" value="${data.value || ''}">
                </div>
            </div>
            <div class="form-row two-col">
                <div class="form-group">
                    <label for="goal-bar-label-${index}">Bar Label</label>
                    <input type="text" id="goal-bar-label-${index}" placeholder="Phase 1" value="${data.barLabel || ''}">
                </div>
                <div class="form-group">
                    <label>Bar Color</label>
                    ${this.createGradientPickerHTML(index, data.barColor, data.gradientColor1, data.gradientColor2)}
                </div>
            </div>
            <div class="marker-toggle-row">
                <label class="checkbox-label">
                    <input type="checkbox" id="goal-striped-${index}" ${data.striped ? 'checked' : ''}>
                    <span>Striped Fill</span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="goal-marker-enabled-${index}" ${markerEnabled ? 'checked' : ''}>
                    <span>Show Marker</span>
                </label>
                <div class="marker-colors" id="goal-marker-colors-${index}" style="opacity: ${markerEnabled ? '1' : '0.5'}">
                    <div class="form-group">
                        <label for="goal-marker-color-${index}">Line/Pill</label>
                        <div class="color-input-wrapper compact">
                            <input type="color" id="goal-marker-color-${index}" value="${data.markerColor || '#312121'}">
                            <input type="text" id="goal-marker-color-text-${index}" value="${data.markerColor || '#312121'}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="goal-marker-text-color-${index}">Text</label>
                        <div class="color-input-wrapper compact">
                            <input type="color" id="goal-marker-text-color-${index}" value="${data.markerTextColor || '#F5E4AF'}">
                            <input type="text" id="goal-marker-text-color-text-${index}" value="${data.markerTextColor || '#F5E4AF'}">
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.goalsContainer.appendChild(item);

        // Remove button
        item.querySelector('[data-action="remove-goal-item"]').addEventListener('click', () => {
            item.remove();
            this.renumberGoalItems();
        });

        // Setup gradient picker
        this.setupGradientPicker(index);

        // Color syncs
        this.setupColorSyncDynamic(`goal-marker-color-${index}`, `goal-marker-color-text-${index}`);
        this.setupColorSyncDynamic(`goal-marker-text-color-${index}`, `goal-marker-text-color-text-${index}`);

        // Marker toggle
        const checkbox = item.querySelector(`#goal-marker-enabled-${index}`);
        checkbox.addEventListener('change', () => {
            const colorsDiv = item.querySelector(`#goal-marker-colors-${index}`);
            colorsDiv.style.opacity = checkbox.checked ? '1' : '0.5';
        });
    }

    setupColorSyncDynamic(pickerId, textId) {
        const picker = document.getElementById(pickerId);
        const text = document.getElementById(textId);
        if (picker && text) {
            picker.addEventListener('input', () => { text.value = picker.value; });
            text.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(text.value)) {
                    picker.value = text.value;
                }
            });
        }
    }

    createGradientPickerHTML(index, barColor, gradientColor1, gradientColor2) {
        // Determine if using gradient based on whether gradient colors exist
        const isGradient = gradientColor1 && gradientColor2;
        const solidColor = barColor || '#F5E4AF';
        const color1 = gradientColor1 || '#F5E4AF';
        const color2 = gradientColor2 || '#D4C48A';

        return `
            <div class="gradient-picker" id="gradient-picker-${index}">
                <div class="gradient-type-toggle">
                    <button type="button" data-type="solid" class="${!isGradient ? 'active' : ''}">Solid</button>
                    <button type="button" data-type="gradient" class="${isGradient ? 'active' : ''}">Gradient</button>
                </div>
                <div class="gradient-solid-picker ${!isGradient ? 'active' : ''}">
                    <div class="color-input-wrapper">
                        <input type="color" id="goal-bar-color-${index}" value="${solidColor}">
                        <input type="text" id="goal-bar-color-text-${index}" value="${solidColor}">
                    </div>
                </div>
                <div class="gradient-colors-picker ${isGradient ? 'active' : ''}">
                    <div class="gradient-color-row">
                        <label>Top</label>
                        <div class="color-input-wrapper">
                            <input type="color" id="goal-gradient-color1-${index}" value="${color1}">
                            <input type="text" id="goal-gradient-color1-text-${index}" value="${color1}">
                        </div>
                    </div>
                    <div class="gradient-color-row">
                        <label>Bottom</label>
                        <div class="color-input-wrapper">
                            <input type="color" id="goal-gradient-color2-${index}" value="${color2}">
                            <input type="text" id="goal-gradient-color2-text-${index}" value="${color2}">
                        </div>
                    </div>
                    <div class="gradient-preview" id="gradient-preview-${index}" style="background: linear-gradient(to bottom, ${color1}, ${color2});"></div>
                </div>
                <input type="hidden" id="goal-use-gradient-${index}" value="${isGradient ? '1' : '0'}">
            </div>
        `;
    }

    setupGradientPicker(index) {
        const picker = document.getElementById(`gradient-picker-${index}`);
        if (!picker) return;

        const toggleBtns = picker.querySelectorAll('.gradient-type-toggle button');
        const solidPicker = picker.querySelector('.gradient-solid-picker');
        const gradientPicker = picker.querySelector('.gradient-colors-picker');
        const useGradientInput = document.getElementById(`goal-use-gradient-${index}`);

        // Toggle buttons
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (btn.dataset.type === 'solid') {
                    solidPicker.classList.add('active');
                    gradientPicker.classList.remove('active');
                    useGradientInput.value = '0';
                } else {
                    solidPicker.classList.remove('active');
                    gradientPicker.classList.add('active');
                    useGradientInput.value = '1';
                }
            });
        });

        // Sync solid color
        this.setupColorSyncDynamic(`goal-bar-color-${index}`, `goal-bar-color-text-${index}`);

        // Sync gradient colors and update preview
        const color1Picker = document.getElementById(`goal-gradient-color1-${index}`);
        const color1Text = document.getElementById(`goal-gradient-color1-text-${index}`);
        const color2Picker = document.getElementById(`goal-gradient-color2-${index}`);
        const color2Text = document.getElementById(`goal-gradient-color2-text-${index}`);
        const preview = document.getElementById(`gradient-preview-${index}`);

        const updatePreview = () => {
            if (preview) {
                preview.style.background = `linear-gradient(to bottom, ${color1Picker.value}, ${color2Picker.value})`;
            }
        };

        if (color1Picker && color1Text) {
            color1Picker.addEventListener('input', () => {
                color1Text.value = color1Picker.value;
                updatePreview();
            });
            color1Text.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(color1Text.value)) {
                    color1Picker.value = color1Text.value;
                    updatePreview();
                }
            });
        }

        if (color2Picker && color2Text) {
            color2Picker.addEventListener('input', () => {
                color2Text.value = color2Picker.value;
                updatePreview();
            });
            color2Text.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(color2Text.value)) {
                    color2Picker.value = color2Text.value;
                    updatePreview();
                }
            });
        }
    }

    setupDonationsGradientPicker() {
        const picker = document.getElementById('donations-gradient-picker');
        if (!picker) return;

        const toggleBtns = picker.querySelectorAll('.gradient-type-toggle button');
        const solidPicker = picker.querySelector('.gradient-solid-picker');
        const gradientPicker = picker.querySelector('.gradient-colors-picker');
        const useGradientInput = document.getElementById('donations-use-gradient');

        // Toggle buttons
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (btn.dataset.type === 'solid') {
                    solidPicker.classList.add('active');
                    gradientPicker.classList.remove('active');
                    useGradientInput.value = '0';
                } else {
                    solidPicker.classList.remove('active');
                    gradientPicker.classList.add('active');
                    useGradientInput.value = '1';
                }
            });
        });

        // Sync gradient colors and update preview
        const color1Picker = document.getElementById('donations-gradient-color1');
        const color1Text = document.getElementById('donations-gradient-color1-text');
        const color2Picker = document.getElementById('donations-gradient-color2');
        const color2Text = document.getElementById('donations-gradient-color2-text');
        const preview = document.getElementById('donations-gradient-preview');

        const updatePreview = () => {
            if (preview) {
                preview.style.background = `linear-gradient(to bottom, ${color1Picker.value}, ${color2Picker.value})`;
            }
        };

        if (color1Picker && color1Text) {
            color1Picker.addEventListener('input', () => {
                color1Text.value = color1Picker.value;
                updatePreview();
            });
            color1Text.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(color1Text.value)) {
                    color1Picker.value = color1Text.value;
                    updatePreview();
                }
            });
        }

        if (color2Picker && color2Text) {
            color2Picker.addEventListener('input', () => {
                color2Text.value = color2Picker.value;
                updatePreview();
            });
            color2Text.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(color2Text.value)) {
                    color2Picker.value = color2Text.value;
                    updatePreview();
                }
            });
        }
    }

    renumberGoalItems() {
        if (!this.goalsContainer) return;
        const items = this.goalsContainer.querySelectorAll('.progress-goal-item');
        items.forEach((item, idx) => {
            item.querySelector('.progress-goal-item-number').textContent = `Goal ${idx + 1}`;
        });
    }

    closeEditor() {
        this.editorModal.hidden = true;
        document.body.style.overflow = '';
        this.editingGoalId = null;
    }

    collectGoalItems() {
        const items = [];
        if (!this.goalsContainer) return items;

        this.goalsContainer.querySelectorAll('.progress-goal-item').forEach(item => {
            const index = item.dataset.index;
            const name = document.getElementById(`goal-name-${index}`)?.value.trim() || '';
            const value = parseInt(document.getElementById(`goal-value-${index}`)?.value) || 0;

            if (name && value > 0) {
                const useGradient = document.getElementById(`goal-use-gradient-${index}`)?.value === '1';
                const goalData = {
                    name,
                    value,
                    barLabel: document.getElementById(`goal-bar-label-${index}`)?.value.trim() || name,
                    barColor: document.getElementById(`goal-bar-color-${index}`)?.value || '#F5E4AF',
                    striped: document.getElementById(`goal-striped-${index}`)?.checked || false,
                    markerEnabled: document.getElementById(`goal-marker-enabled-${index}`)?.checked || false,
                    markerColor: document.getElementById(`goal-marker-color-${index}`)?.value || '#312121',
                    markerTextColor: document.getElementById(`goal-marker-text-color-${index}`)?.value || '#F5E4AF'
                };

                // Add gradient colors if using gradient
                if (useGradient) {
                    goalData.gradientColor1 = document.getElementById(`goal-gradient-color1-${index}`)?.value || '#F5E4AF';
                    goalData.gradientColor2 = document.getElementById(`goal-gradient-color2-${index}`)?.value || '#D4C48A';
                }

                items.push(goalData);
            }
        });
        return items;
    }

    collectDonations() {
        const useGradient = document.getElementById('donations-use-gradient')?.value === '1';
        const donations = {
            value: parseInt(document.getElementById('donations-value')?.value) || 0,
            color: document.getElementById('donations-color')?.value || '#e85a71',
            markerEnabled: document.getElementById('donations-marker-enabled')?.checked || false,
            markerColor: document.getElementById('donations-marker-color')?.value || '#e85a71',
            markerTextColor: document.getElementById('donations-marker-text-color')?.value || '#f7f7f7'
        };

        // Add gradient colors if using gradient
        if (useGradient) {
            donations.gradientColor1 = document.getElementById('donations-gradient-color1')?.value || '#e85a71';
            donations.gradientColor2 = document.getElementById('donations-gradient-color2')?.value || '#c44a5f';
        }

        return donations;
    }

    async saveGoal(e) {
        e.preventDefault();

        const label = document.getElementById('progress-goal-label').value.trim();
        const title = document.getElementById('progress-goal-title').value.trim();
        const link = document.getElementById('progress-goal-link').value.trim();
        const goals = this.collectGoalItems();
        const donations = this.collectDonations();

        if (!title) {
            alert('Please enter a goal title.');
            return;
        }

        if (!donations.value) {
            alert('Please enter a donations value.');
            return;
        }

        const goalData = {
            label,
            title,
            link,
            goals,
            donations,
            order: this.editingGoalId
                ? this.goals.find(g => g.id === this.editingGoalId)?.order || 999
                : this.goals.length + 1
        };

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
        const btn = document.getElementById('save-all-progress-btn');
        const defaultIcon = btn.querySelector('.default-icon');
        const spinnerIcon = btn.querySelector('.spinner-icon');
        const successIcon = btn.querySelector('.success-icon');
        const btnText = btn.querySelector('.btn-text');

        // Show spinner state
        btn.disabled = true;
        btn.classList.add('publishing');
        defaultIcon.style.display = 'none';
        spinnerIcon.style.display = 'inline';
        successIcon.style.display = 'none';
        btnText.textContent = 'Publishing...';

        try {
            // Save each goal to Supabase (instant update!)
            for (const goal of this.goals) {
                const dbGoal = {
                    id: goal.id,
                    label: goal.label || '',
                    title: goal.title,
                    link: goal.link,
                    goals: JSON.stringify(goal.goals || []),
                    donations: JSON.stringify(goal.donations || {}),
                    sort_order: goal.order || 0
                };

                // Check if goal exists
                const existingGoals = await supabase.query('progress_goals', { eq: { id: goal.id } });
                if (existingGoals.length > 0) {
                    await progressAPI.updateGoal(goal.id, dbGoal);
                } else {
                    await progressAPI.createGoal(dbGoal);
                }
            }

            // Show success state
            btn.classList.remove('publishing');
            btn.classList.add('btn-success');
            spinnerIcon.style.display = 'none';
            successIcon.style.display = 'inline';
            btnText.textContent = 'Published!';

            this.hasUnsavedChanges = false;
            this.updateSaveButton();

            // Reset button after delay
            setTimeout(() => {
                btn.classList.remove('btn-success');
                defaultIcon.style.display = 'inline';
                successIcon.style.display = 'none';
                btnText.textContent = 'Publish Changes';
                btn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Save error:', error);
            // Show error state
            btn.classList.remove('publishing');
            btn.classList.add('btn-error');
            spinnerIcon.style.display = 'none';
            defaultIcon.style.display = 'inline';
            btnText.textContent = 'Error - Try Again';
            btn.disabled = false;

            // Reset button after delay
            setTimeout(() => {
                btn.classList.remove('btn-error');
                btnText.textContent = 'Publish Changes';
            }, 3000);
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

    async confirmDelete() {
        if (!this.deleteGoalId) return;

        const publishingModal = document.getElementById('publishing-modal');
        const publishingStatus = document.getElementById('publishing-status');
        const publishingSpinner = document.getElementById('publishing-spinner');

        this.closeDeleteModal();
        publishingModal.hidden = false;
        publishingStatus.textContent = 'Deleting goal...';
        publishingStatus.className = 'publishing-status';
        publishingSpinner.hidden = false;

        try {
            // Delete directly from Supabase (instant!)
            await progressAPI.deleteGoal(this.deleteGoalId);

            publishingStatus.textContent = 'Goal deleted successfully!';
            publishingStatus.className = 'publishing-status success';
            publishingSpinner.hidden = true;

            // Update local data
            this.goals = this.goals.filter(g => g.id !== this.deleteGoalId);
            this.renderGoalsList();

            setTimeout(() => {
                publishingModal.hidden = true;
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
// Tab Navigation
// ============================================================

function setupTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const tabContents = {
        posts: document.getElementById('posts-tab'),
        gallery: document.getElementById('gallery-tab'),
        progress: document.getElementById('progress-tab'),
        about: document.getElementById('about-tab'),
        mission: document.getElementById('mission-tab'),
        goals: document.getElementById('goals-tab')
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


// ============================================================
// About Us Manager
// ============================================================

class AboutManager {
    constructor() {
        this.apiBase = '/.netlify/functions';
        this.trustees = null;
        this.advisors = [];
        this.editingAdvisorId = null;
        this.deleteAdvisorId = null;

        // DOM Elements
        this.trusteesTextarea = document.getElementById('trustees-text');
        this.advisorsList = document.getElementById('advisors-list');
        this.editorModal = document.getElementById('advisor-editor-modal');
        this.deleteModal = document.getElementById('delete-advisor-modal');
        this.form = document.getElementById('advisor-form');

        this.init();
    }

    async init() {
        console.log('AboutManager init starting');
        try {
            await this.loadContent();
            this.renderAdvisorsList();
        } catch (error) {
            console.error('Error initializing AboutManager:', error);
        }
        // Always setup event listeners even if loading fails
        this.setupEventListeners();
        console.log('AboutManager init complete');
    }

    async loadContent() {
        try {
            const content = await aboutAPI.getContent();

            // Find trustees
            const trusteesItem = content.find(c => c.type === 'trustees');
            if (trusteesItem) {
                this.trustees = trusteesItem;
                this.trusteesTextarea.value = trusteesItem.content || '';
            } else {
                // Seed default trustees content from HTML
                this.trusteesTextarea.value = 'The two trustees are Drs. Les and Barbara Omotani. We are lifelong teachers and educational leaders [successfully and happily retired] who have supported the education, health and well being of local children in North America and throughout the world. The trustees have extensive experience serving on advisory boards for IBM, Xerox Canada, the Grammy Foundation, several national professional associations, Division I Alumni associations, national and international charities and a private bank. The two trustees have personally provided over 90% of the funding for the Omotani Caring Foundation\'s activities.';
            }

            // Find advisors
            this.advisors = content.filter(c => c.type === 'advisor').sort((a, b) => a.sort_order - b.sort_order);

            // If no advisors in database, seed default advisors from HTML
            if (this.advisors.length === 0) {
                await this.seedDefaultAdvisors();
            }
        } catch (error) {
            console.error('Error loading about content:', error);
            this.advisors = [];
        }
    }

    async seedDefaultAdvisors() {
        const defaultAdvisors = [
            {
                id: 'advisor-paul-kirui',
                type: 'advisor',
                sort_order: 0,
                data: JSON.stringify({
                    name: 'Paul Kirui',
                    title: 'Senior Advisor',
                    photo: 'images/AboutUs/Paul-Kirui-Hero.webp',
                    bio: 'Paul Kirui serves as a senior advisor to the Omotani Caring Foundation. He grew up on the Masai Mara National Reserve in Kenya and is one of Africa\'s most experienced, knowledgeable and distinguished safari guides and professional photographers. Paul is an amazing and caring advocate for the children of Bwindi [and all of Africa], a personal supporter of the porters, rangers, guides, local families (including the Batwa) in the Bwindi region and a lead supporter for the Bwindi Plus School.',
                    links: [
                        { label: 'Natural Habitat Adventures Bio', url: 'https://www.nathab.com/guides-and-staff/guide-bios/paul-kirui/' },
                        { label: 'Paul Kirui Photography', url: 'http://www.paulkirui-photography.com/' }
                    ],
                    partnerLogo: 'images/AboutUs/natHab-small.webp',
                    partnerName: 'Natural Habitat Adventures',
                    tallCard: false
                })
            },
            {
                id: 'advisor-koen-van-rompay',
                type: 'advisor',
                sort_order: 1,
                data: JSON.stringify({
                    name: 'Koen Van Rompay',
                    title: 'D.V.M., Ph.D., USA Advisor',
                    photo: 'images/AboutUs/Koen.jpg',
                    bio: 'Koen Van Rompay is a collaborative partner based in the USA. He is a medical researcher in infectious diseases at the University of California, Davis. He is also the founder and executive director of the volunteer-based 501(c)3 nonprofit organization Sahaya International, which supports local initiatives in several developing countries. Koen is the original supporter and facilitator for the Rafiki Wildlife Conservation Initiative based in Bwindi, Uganda.',
                    links: [
                        { label: 'Sahaya International', url: 'http://www.sahaya.org/' },
                        { label: 'Rafiki Memorial Wildlife Conservation Initiative', url: 'http://rafikiwildlife.org/partners/' },
                        { label: 'UC Davis Research Profile', url: 'https://cnprc.ucdavis.edu/wp-content/uploads/2015/08/KKVanRompay.pdf' }
                    ],
                    partnerLogo: 'images/AboutUs/cropped-Rafiki-logo-square.webp',
                    partnerName: 'Rafiki Wildlife',
                    tallCard: false
                })
            },
            {
                id: 'advisor-brad-josephs',
                type: 'advisor',
                sort_order: 2,
                data: JSON.stringify({
                    name: 'Brad Josephs',
                    title: 'USA and International Advisor',
                    photo: 'images/AboutUs/Screenshot 2025-12-12 191523.png',
                    bio: 'The Omotani Caring Foundation welcomes Brad Josephs to serve as its USA and International Advisor. Specifically, Brad will share his knowledge, expertise and insights that support the conservation of brown bears and the training of local people to work as guides, spotters, local tourism support and other roles in the high Himalayan mountains of India and throughout the USA. We believe that Brad can lead the conservation efforts of the high Himalayan brown bear as a keystone umbrella species and engage the local people as full participants in the development of a successful and comprehensive nature tourism initiative.\n\nBrad has been a professional naturalist guide, wildlife photographer and wildlife expedition leader since he graduated from the University of Alaska, Fairbanks with a B.S. in wildlife biology in 1999. For over two decades, Brad has guided numerous professional photographers, photography workshops, bear viewers and film crews on expeditions to view coastal brown bears along the remote Coast of Katmai National Park, Alaska, and wildlife expeditions in China and Borneo. Brad is and has always been obsessed with encouraging wildlife and wilderness conservation in all corners of the world.\n\nMost recently, Brad has chased his life-long fantasy of seeing snow leopards in the wild in the Indian Himalayas and Qinghai-Tibetan Plateau of China. He guides and leads Voygr\'s snow leopard expeditions and helps local herders build predator proof corrals to keep their cattle safe. The OCF is supporting THE HIGH ASIA HABITAT FUND and its mission of protecting the Himalayan snow leopards, the local people and the future successful conservation of the high Himalayan brown bears through responsible tourism. https://highasiafund.org\n\nWhen not traveling for work, Brad keeps busy as a freelance wildlife writer/photographer/videographer, consultant for wildlife film projects, and lectures at schools, government agencies and organizations on natural history and bear biology and safety. Brad\'s hobbies include botany, gardening, bird watching, fly fishing and canoeing in the Ozarks of Arkansas where he recently moved from Alaska. Brad is also a former EMT with the Homer, Alaska fire department, and is a certified Wilderness First Responder.',
                    links: [
                        { label: 'YouTube', url: 'https://www.youtube.com/@bradjosephs' },
                        { label: 'Voygr Team', url: 'https://voygr.com/team/brad-josephs/' },
                        { label: 'Voygr Expeditions', url: 'https://voygr.com' }
                    ],
                    partnerLogo: 'images/AboutUs/Voygr.webp',
                    partnerName: 'Voygr Expeditions',
                    tallCard: true
                })
            },
            {
                id: 'advisor-ang-rita-sherpa',
                type: 'advisor',
                sort_order: 3,
                data: JSON.stringify({
                    name: 'Ang Rita Sherpa',
                    title: 'Nepal Advisor',
                    photo: 'images/AboutUs/AngRitaSherpa.jpg',
                    bio: 'We first met Ang Rita Sherpa in 2013 during a National Geographic Expedition to South Georgia Island and Antarctica. Ang and his wife, Nawang were traveling with Ang\'s childhood friend Peter Hillary. The Omotani Caring Foundation is proud of its support of many projects implemented by THE PARTNERS NEPAL. We appreciate the willingness of Ang Rita Sherpa to serve as our Advisor for Nepal.\n\nAng Rita Sherpa, of Khunde village in Nepal, has served as the Chairman of THE PARTNERS NEPAL since 2012. Ang has extensive experience in conservation, tourism, sustainability, and supporting the people in the most remote villages of Nepal. He was worked with members of the USA national parks service and was a key leader with the Himalayan Trust established by Sir Edmund Hillary in 1964.',
                    links: [
                        { label: 'The Partners Nepal - Ang Rita Sherpa', url: 'https://thepartnersnepal.org/team/ang-rita-sherpa/' },
                        { label: 'The Partners Nepal', url: 'https://thepartnersnepal.org' }
                    ],
                    partnerLogo: 'images/AboutUs/The-Partners-Nepal-Logo.png',
                    partnerName: 'The Partners Nepal',
                    tallCard: false
                })
            }
        ];

        try {
            for (const advisor of defaultAdvisors) {
                await aboutAPI.upsert(advisor);
            }
            this.advisors = defaultAdvisors;
        } catch (error) {
            console.error('Error seeding default advisors:', error);
        }
    }

    setupEventListeners() {
        // Save trustees
        const saveTrusteesBtn = document.getElementById('save-trustees-btn');
        if (saveTrusteesBtn) {
            saveTrusteesBtn.addEventListener('click', () => this.saveTrustees());
        }

        // Add advisor
        const addAdvisorBtn = document.getElementById('add-advisor-btn');
        if (addAdvisorBtn) {
            addAdvisorBtn.addEventListener('click', () => this.showEditor());
        }

        // Form
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.saveAdvisor(e));
        }
        const cancelAdvisorEdit = document.getElementById('cancel-advisor-edit');
        if (cancelAdvisorEdit) {
            cancelAdvisorEdit.addEventListener('click', () => this.closeEditor());
        }

        // Delete modal
        const cancelAdvisorDelete = document.getElementById('cancel-advisor-delete');
        if (cancelAdvisorDelete) {
            cancelAdvisorDelete.addEventListener('click', () => this.closeDeleteModal());
        }
        const confirmAdvisorDelete = document.getElementById('confirm-advisor-delete');
        if (confirmAdvisorDelete) {
            confirmAdvisorDelete.addEventListener('click', () => this.confirmDelete());
        }

        // Close modals
        if (this.editorModal) {
            const closeBtn = this.editorModal.querySelector('.modal-close');
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeEditor());
            const backdrop = this.editorModal.querySelector('.modal-backdrop');
            if (backdrop) backdrop.addEventListener('click', () => this.closeEditor());
        }

        // Photo preview
        const photoInput = document.getElementById('advisor-photo');
        if (photoInput) {
            photoInput.addEventListener('input', () => this.updatePhotoPreview());
        }

        // File upload
        const fileInput = document.getElementById('advisor-photo-file');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }

        // Partner logo inputs and file uploads
        for (let i = 0; i < 3; i++) {
            const logoInput = document.getElementById(`advisor-partner-logo-${i}`);
            if (logoInput) {
                logoInput.addEventListener('input', () => this.updatePartnerLogoPreviews());
            }

            const logoFileInput = document.getElementById(`advisor-partner-logo-file-${i}`);
            if (logoFileInput) {
                logoFileInput.addEventListener('change', (e) => this.handlePartnerLogoUpload(e, i));
            }
        }
    }

    async saveTrustees() {
        try {
            const content = this.trusteesTextarea.value;
            const item = {
                id: this.trustees?.id || 'trustees',
                type: 'trustees',
                content: content,
                sort_order: 0
            };
            await aboutAPI.upsert(item);
            this.trustees = item;
            alert('Trustees text saved successfully!');
        } catch (error) {
            console.error('Error saving trustees:', error);
            alert('Error saving trustees: ' + error.message);
        }
    }

    renderAdvisorsList() {
        if (this.advisors.length === 0) {
            this.advisorsList.innerHTML = '<div class="loading-message">No advisors found. Click "Add Advisor" to create one.</div>';
            return;
        }

        this.advisorsList.innerHTML = this.advisors.map(advisor => {
            const data = typeof advisor.data === 'string' ? JSON.parse(advisor.data) : (advisor.data || {});
            return `
                <div class="advisor-card-admin" data-id="${advisor.id}" draggable="true">
                    <div class="advisor-drag-handle">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 4H6V6H4V4ZM10 4H12V6H10V4ZM4 7H6V9H4V7ZM10 7H12V9H10V7ZM4 10H6V12H4V10ZM10 10H12V12H10V10Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="advisor-preview">
                        <div class="advisor-preview-photo" style="background-image: url('${data.photo || ''}');"></div>
                        <div class="advisor-preview-info">
                            <h4>${data.name || 'Untitled'}</h4>
                            <p>${data.title || ''}</p>
                        </div>
                    </div>
                    <div class="advisor-actions">
                        <button type="button" class="btn-action btn-edit" data-action="edit" data-id="${advisor.id}">Edit</button>
                        <button type="button" class="btn-action btn-delete" data-action="delete" data-id="${advisor.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        this.advisorsList.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => this.showEditor(btn.dataset.id));
        });
        this.advisorsList.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => this.showDeleteModal(btn.dataset.id));
        });

        // Setup drag and drop
        this.setupDragDrop();
    }

    setupDragDrop() {
        const cards = this.advisorsList.querySelectorAll('.advisor-card-admin');
        let draggedItem = null;

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                draggedItem = card;
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
                this.updateOrder();
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && draggedItem !== card) {
                    const rect = card.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        card.parentNode.insertBefore(draggedItem, card);
                    } else {
                        card.parentNode.insertBefore(draggedItem, card.nextSibling);
                    }
                }
            });
        });
    }

    async updateOrder() {
        const cards = this.advisorsList.querySelectorAll('.advisor-card-admin');
        const updates = [];

        cards.forEach((card, index) => {
            const id = card.dataset.id;
            const advisor = this.advisors.find(a => a.id === id);
            if (advisor) {
                advisor.sort_order = index;
                updates.push(aboutAPI.update(id, { sort_order: index }));
            }
        });

        try {
            await Promise.all(updates);
        } catch (error) {
            console.error('Error updating order:', error);
        }
    }

    showEditor(advisorId = null) {
        console.log('showEditor called with advisorId:', advisorId);
        this.editingAdvisorId = advisorId;
        const title = document.getElementById('advisor-editor-title');

        if (!this.editorModal) {
            console.error('Editor modal not found');
            return;
        }

        if (advisorId) {
            title.textContent = 'Edit Advisor';
            const advisor = this.advisors.find(a => a.id === advisorId);
            if (advisor) {
                const data = typeof advisor.data === 'string' ? JSON.parse(advisor.data) : (advisor.data || {});
                document.getElementById('advisor-id').value = advisorId;
                document.getElementById('advisor-name').value = data.name || '';
                document.getElementById('advisor-title').value = data.title || '';
                document.getElementById('advisor-photo').value = data.photo || '';
                document.getElementById('advisor-bio').value = data.bio || '';
                document.getElementById('advisor-links').value = (data.links || []).map(l => `${l.label}|${l.url}`).join('\n');

                // Handle partner logos - support both old single format and new array format
                const partnerLogos = data.partnerLogos || [];
                // Migrate old single partnerLogo/partnerName to new format
                if (!partnerLogos.length && (data.partnerLogo || data.partnerName)) {
                    partnerLogos.push({ logo: data.partnerLogo || '', name: data.partnerName || '' });
                }
                // Populate the 3 logo slots
                for (let i = 0; i < 3; i++) {
                    const logo = partnerLogos[i] || { logo: '', name: '' };
                    document.getElementById(`advisor-partner-logo-${i}`).value = logo.logo || '';
                    document.getElementById(`advisor-partner-name-${i}`).value = logo.name || '';
                }

                document.getElementById('advisor-tall-card').checked = data.tallCard || false;
                this.updatePhotoPreview();
                this.updatePartnerLogoPreviews();
            }
        } else {
            title.textContent = 'Add Advisor';
            this.resetForm();
        }

        this.editorModal.hidden = false;
    }

    closeEditor() {
        this.editorModal.hidden = true;
        this.editingAdvisorId = null;
        this.resetForm();
    }

    resetForm() {
        document.getElementById('advisor-id').value = '';
        document.getElementById('advisor-name').value = '';
        document.getElementById('advisor-title').value = '';
        document.getElementById('advisor-photo').value = '';
        document.getElementById('advisor-bio').value = '';
        document.getElementById('advisor-links').value = '';
        // Reset all 3 partner logo slots
        for (let i = 0; i < 3; i++) {
            document.getElementById(`advisor-partner-logo-${i}`).value = '';
            document.getElementById(`advisor-partner-name-${i}`).value = '';
            document.getElementById(`advisor-partner-logo-file-name-${i}`).textContent = 'No file chosen';
        }
        document.getElementById('advisor-tall-card').checked = false;
        document.getElementById('advisor-photo-file-name').textContent = 'No file chosen';
        this.updatePhotoPreview();
        this.updatePartnerLogoPreviews();
    }

    updatePhotoPreview() {
        const photoPath = document.getElementById('advisor-photo').value;
        const preview = document.getElementById('advisor-photo-preview');
        if (photoPath) {
            preview.innerHTML = `<img src="${photoPath}" alt="Preview" onerror="this.parentNode.innerHTML='<span class=\\'image-preview-placeholder\\'>Failed to load</span>'">`;
        } else {
            preview.innerHTML = '<span class="image-preview-placeholder">Photo preview</span>';
        }
    }

    async handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('advisor-photo-file-name').textContent = file.name;

        try {
            const base64 = await this.fileToBase64(file);
            const response = await fetch(`${this.apiBase}/upload-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: base64,
                    filename: file.name,
                    folder: 'images/AboutUs'
                })
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            document.getElementById('advisor-photo').value = result.path;
            this.updatePhotoPreview();
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Error uploading photo: ' + error.message);
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
    }

    updatePartnerLogoPreviews() {
        for (let i = 0; i < 3; i++) {
            const logoPath = document.getElementById(`advisor-partner-logo-${i}`).value;
            const preview = document.getElementById(`partner-logo-preview-${i}`);
            if (logoPath) {
                preview.innerHTML = `<img src="${logoPath}" alt="Logo preview" onerror="this.parentNode.innerHTML='<span class=\\'image-preview-placeholder\\'>Failed to load</span>'">`;
            } else {
                preview.innerHTML = '<span class="image-preview-placeholder">Logo preview</span>';
            }
        }
    }

    async handlePartnerLogoUpload(e, index) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById(`advisor-partner-logo-file-name-${index}`).textContent = file.name;

        try {
            const base64 = await this.fileToBase64(file);
            const response = await fetch(`${this.apiBase}/upload-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: base64,
                    filename: file.name,
                    folder: 'images/AboutUs'
                })
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            document.getElementById(`advisor-partner-logo-${index}`).value = result.path;
            this.updatePartnerLogoPreviews();
        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('Error uploading logo: ' + error.message);
        }
    }

    async saveAdvisor(e) {
        e.preventDefault();

        const linksText = document.getElementById('advisor-links').value;
        const links = linksText.split('\n').filter(l => l.trim()).map(line => {
            const [label, url] = line.split('|');
            return { label: label?.trim() || '', url: url?.trim() || '' };
        });

        // Collect partner logos (filter out empty ones)
        const partnerLogos = [];
        for (let i = 0; i < 3; i++) {
            const logo = document.getElementById(`advisor-partner-logo-${i}`).value.trim();
            const name = document.getElementById(`advisor-partner-name-${i}`).value.trim();
            if (logo || name) {
                partnerLogos.push({ logo, name });
            }
        }

        const data = {
            name: document.getElementById('advisor-name').value,
            title: document.getElementById('advisor-title').value,
            photo: document.getElementById('advisor-photo').value,
            bio: document.getElementById('advisor-bio').value,
            links: links,
            partnerLogos: partnerLogos,
            // Keep backward compatibility - first logo also stored in old fields
            partnerLogo: partnerLogos[0]?.logo || '',
            partnerName: partnerLogos[0]?.name || '',
            tallCard: document.getElementById('advisor-tall-card').checked
        };

        const item = {
            id: this.editingAdvisorId || `advisor-${Date.now()}`,
            type: 'advisor',
            data: JSON.stringify(data),
            sort_order: this.editingAdvisorId ? (this.advisors.find(a => a.id === this.editingAdvisorId)?.sort_order || 0) : this.advisors.length
        };

        try {
            await aboutAPI.upsert(item);
            await this.loadContent();
            this.renderAdvisorsList();
            this.closeEditor();
        } catch (error) {
            console.error('Error saving advisor:', error);
            alert('Error saving advisor: ' + error.message);
        }
    }

    showDeleteModal(advisorId) {
        this.deleteAdvisorId = advisorId;
        const advisor = this.advisors.find(a => a.id === advisorId);
        const data = advisor ? (typeof advisor.data === 'string' ? JSON.parse(advisor.data) : advisor.data) : {};
        document.getElementById('delete-advisor-title').textContent = `Are you sure you want to delete "${data.name || 'this advisor'}"?`;
        this.deleteModal.hidden = false;
    }

    closeDeleteModal() {
        this.deleteModal.hidden = true;
        this.deleteAdvisorId = null;
    }

    async confirmDelete() {
        if (!this.deleteAdvisorId) return;

        try {
            await aboutAPI.delete(this.deleteAdvisorId);
            await this.loadContent();
            this.renderAdvisorsList();
            this.closeDeleteModal();
        } catch (error) {
            console.error('Error deleting advisor:', error);
            alert('Error deleting advisor: ' + error.message);
        }
    }
}


// ============================================================
// Mission Manager
// ============================================================

class MissionManager {
    constructor() {
        this.apiBase = '/.netlify/functions';
        this.statements = [];
        this.goalCards = [];
        this.goalPageHeroImages = {};
        this.settings = null;
        this.editingStatementId = null;
        this.editingGoalCardId = null;
        this.deleteStatementId = null;

        // DOM Elements
        this.statementsList = document.getElementById('mission-statements-list');
        this.goalCardsList = document.getElementById('goal-cards-list');
        this.statementModal = document.getElementById('mission-statement-modal');
        this.goalCardModal = document.getElementById('goal-card-modal');
        this.deleteStatementModal = document.getElementById('delete-mission-statement-modal');
        this.statementForm = document.getElementById('mission-statement-form');
        this.goalCardForm = document.getElementById('goal-card-form');

        this.init();
    }

    async init() {
        await this.loadContent();
        this.renderStatementsList();
        this.renderGoalCardsList();
        this.setupEventListeners();
    }

    async loadContent() {
        try {
            // Load goal pages for hero images
            const goalPages = await goalPagesAPI.getAll();
            this.goalPageHeroImages = {};
            if (goalPages && goalPages.length > 0) {
                goalPages.forEach(page => {
                    if (page.slug && page.hero_image) {
                        this.goalPageHeroImages[page.slug] = page.hero_image;
                    }
                });
            }

            this.statements = await missionAPI.getStatements();
            this.goalCards = await missionAPI.getGoalCards();
            this.settings = await missionAPI.getSettings();

            // Load mission breaker image
            if (this.settings?.breaker_image) {
                document.getElementById('mission-breaker-image').value = this.settings.breaker_image;
                this.updateBreakerPreview();
            } else {
                // Seed default breaker image
                document.getElementById('mission-breaker-image').value = 'images/mission-breaker.jpg';
                this.updateBreakerPreview();
            }

            // Seed default statements if empty
            if (this.statements.length === 0) {
                await this.seedDefaultStatements();
            }

            // Seed default goal cards if empty
            if (this.goalCards.length === 0) {
                await this.seedDefaultGoalCards();
            }
        } catch (error) {
            console.error('Error loading mission content:', error);
            this.statements = [];
            this.goalCards = [];
        }
    }

    async seedDefaultStatements() {
        const defaultStatements = [
            { id: 'statement-1', content: 'We provide basic food and other supplies for many families (including the Batwa) and porters in rural villages.', full_width: false, sort_order: 0 },
            { id: 'statement-2', content: 'We support the self-identified needs of schools that serve local and native children in the USA and throughout the world. We are advocates for children with special needs and talents.', full_width: false, sort_order: 1 },
            { id: 'statement-3', content: 'We support projects that promote the ability of local people to meet the challenges of food scarcity and to preserve their indigenous cultures.', full_width: false, sort_order: 2 },
            { id: 'statement-4', content: 'We support the dreams and visions of charitable leaders who seek to provide care and support to children and families in local communities throughout the world.', full_width: false, sort_order: 3 },
            { id: 'statement-5', content: 'We support servant leaders who provide caring services, education and mentoring for military veterans and their families, first responders, prison inmates, native peoples, equine trainers and ranchers, and others as they learn modern horsemanship to gentle and train wild mustangs. We also support those who help provide forever homes for the mustangs.', full_width: true, sort_order: 4 },
            { id: 'statement-6', content: 'We support the conservation efforts of local, national and international individuals and groups who work to ensure the future health of natural environments, marine life and wildlife.', full_width: false, sort_order: 5 }
        ];

        try {
            for (const statement of defaultStatements) {
                await missionAPI.upsertStatement(statement);
            }
            this.statements = defaultStatements;
        } catch (error) {
            console.error('Error seeding default statements:', error);
        }
    }

    async seedDefaultGoalCards() {
        const defaultGoalCards = [
            { id: 'goal-1', label: 'Goal One:', title: 'Sustainability', subtitle: 'Batwa Farms at Matanda, Uganda', description: 'The Omotani Caring Foundation [OCF] has purchased approximately 10 acres of very fertile and productive farmland at Matanda [near Kihihi] Uganda. In collaboration with the Rafiki Memorial Wildlife Conservation Initiative this new farming project will involve and support Batwa families from the Kibirangwe, Nyabisiika, Mukongoro and Karehe settlements.', image: 'images/batwa+visit+farm+ocf.jpg', link: 'goalone.html', sort_order: 0 },
            { id: 'goal-2', label: 'Goal Two:', title: 'Porters at Bwindi', subtitle: '', description: 'Support the development and expansion of food related sustainability project that will allow the porters in one of the four major porter\'s association to supplement the income they receive from tourism. This project will be coordinated with the support and project accountability controls of the Rafiki Wildlife Conservation Initiative.', image: 'images/porters+in+field.jpg', link: 'goaltwo.html', sort_order: 1 },
            { id: 'goal-3', label: 'Goal Three:', title: 'Health', subtitle: '', description: 'Develop an emergency reserve fund of $5,000 to be used for future purchases and distribution of foods rich in protein such as maize / corn flour, beans and fruits. Also provide for the purchase of soap, masks, medicine and other emergency supplies.', image: 'images/img_20211206_100240_1+2.jpg', link: 'goalthree.html', sort_order: 2 },
            { id: 'goal-4', label: 'Goal Four:', title: 'Technology', subtitle: '', description: 'In 2019 - 2022 the OCF provided over $3,500 USD in funding to support the first computers, printers and digital cameras to be used by school children in Bwindi, Uganda. In the future grants will be made to support similar projects in the USA, Canada and other regions of the world.', image: 'images/whatsapp+image+2021-09-16+at+10.39.46+pm.jpg', link: 'goalfour.html', sort_order: 3 },
            { id: 'goal-5', label: 'Goal Five:', title: 'Fresh Water', subtitle: '', description: 'Access to daily fresh drinking water remains a challenge for underserved Native American families throughout the USA and villages throughout the world. The foundation provides support to local families and groups who address this need by drilling fresh water wells, providing water treatment systems, and other alternative strategies.', image: 'images/water.jpg', link: 'goalfive.html', sort_order: 4 },
            { id: 'goal-6', label: 'Goal Six:', title: 'Education', subtitle: '', description: 'K-12 and Higher education for children who live in poverty and/or require special education support services exist throughout the United States and the world. The OCF has provided tuition fees for orphan students in Bwindi for their entire elementary education.', image: 'images/unified+basketball+hhs2023.jpg', link: 'goalsix.html', sort_order: 5 },
            { id: 'goal-7', label: 'Goal Seven:', title: 'Dreams & Visions - Donor Requests', subtitle: '', description: 'Donors who wish to submit a specific request to the OMOTANI CARING FOUNDATION in support of a project or initiative that is meaningful and personal are encouraged to submit a description of the proposal and potential level of funding. DREAMS AND VISIONS = $ UNLIMITED', image: 'images/linda+mercyjpeg.jpg', link: 'goalseven.html', sort_order: 6 },
            { id: 'goal-8', label: 'Goal Eight:', title: 'The Partners Nepal', subtitle: 'Strengthen Relationships', description: 'Drs. Les and Barbara Omotani [The Omotani Caring Foundation] met Ang Rita Sherpa and Peter Hillary during a 2014 National Geographic Expedition adventure. Throughout the years, Barbara and Les Omotani have provided private donations to support the work of THE PARTNERS NEPAL [TPN].', image: 'images/tpn.jpg', link: 'goaleight.html', sort_order: 7 },
            { id: 'goal-9', label: 'Goal Nine:', title: 'Women In Gorilla Conservation', subtitle: '', description: 'The Omotani Caring Foundation is pleased to collaborate with Sahaya International and the Rafiki Memorial Wildlife Conservation Initiative to support a project initiated by Robinah Gangiriba [Warden of Tourism of the Ugandan Wildlife Authority].', image: 'images/womengorilla.png', link: 'goalnine.html', sort_order: 8 },
            { id: 'goal-10', label: 'Goal Ten:', title: 'Base Camp for Veterans BCI', subtitle: '', description: 'BaseCamp for Veterans, Inc. ("BCI") was founded by life-long friends Deborah Plum & Theo Windish. The Omotani Caring Foundation [OCF] has been pleased to provide support to BCI for 2024, 2025 and beyond.', image: 'images/img_8308.jpg', link: 'goalten.html', sort_order: 9 },
            { id: 'goal-11', label: 'Goal Eleven:', title: 'Randy Helm Horsemanship', subtitle: '', description: 'We are pleased to support Randy Helm and his continuing work to train wild mustangs and to support a wide variety of people to learn how to be good and great horsemanship learners and riders. Randy has successfully led the State of Arizona\'s Wild Horse Inmate program and is a facilitator with Base Camp for Veterans.', image: 'images/randyhelm.jpg', link: 'goaleleven.html', sort_order: 10 },
            { id: 'goal-12', label: 'Goal Twelve:', title: 'High Asia Habitat Fund', subtitle: '', description: 'The Omotani Caring Foundation is pleased to become a supporter of the High Asia Habitat Fund. The founder of HAHF, Behzad Larry, is committed to the conservation of the snow leopards and other wildlife in the region. HAHF is also supporting the training of local people to help them and their cattle coexist with wildlife in the remote regions of the high Himalayan mountains.', image: 'images/goal12.jpg', link: 'goaltwelve.html', sort_order: 11 }
        ];

        try {
            for (const card of defaultGoalCards) {
                await missionAPI.upsertGoalCard(card);
            }
            this.goalCards = defaultGoalCards;
        } catch (error) {
            console.error('Error seeding default goal cards:', error);
        }
    }

    setupEventListeners() {
        // Save breaker image
        document.getElementById('save-mission-breaker-btn').addEventListener('click', () => this.saveBreakerImage());

        // Breaker image preview
        document.getElementById('mission-breaker-image').addEventListener('input', () => this.updateBreakerPreview());

        // Breaker image file upload
        const breakerFileInput = document.getElementById('mission-breaker-file');
        if (breakerFileInput) {
            breakerFileInput.addEventListener('change', (e) => this.handleBreakerImageUpload(e));
        }

        // Add statement
        document.getElementById('add-mission-statement-btn').addEventListener('click', () => this.showStatementEditor());

        // Statement form
        this.statementForm.addEventListener('submit', (e) => this.saveStatement(e));
        document.getElementById('cancel-mission-statement').addEventListener('click', () => this.closeStatementEditor());

        // Goal card form
        this.goalCardForm.addEventListener('submit', (e) => this.saveGoalCard(e));
        document.getElementById('cancel-goal-card').addEventListener('click', () => this.closeGoalCardEditor());

        // Delete statement modal
        document.getElementById('cancel-statement-delete').addEventListener('click', () => this.closeDeleteStatementModal());
        document.getElementById('confirm-statement-delete').addEventListener('click', () => this.confirmDeleteStatement());

        // Close modals
        this.statementModal.querySelector('.modal-close').addEventListener('click', () => this.closeStatementEditor());
        this.statementModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeStatementEditor());
        this.goalCardModal.querySelector('.modal-close').addEventListener('click', () => this.closeGoalCardEditor());
        this.goalCardModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeGoalCardEditor());

        // Go to Goal Pages button
        document.getElementById('go-to-goal-pages-btn').addEventListener('click', () => {
            // Switch to Goals tab
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="goals"]').classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.hidden = true);
            document.getElementById('goals-tab').hidden = false;
        });
    }

    updateBreakerPreview() {
        const path = document.getElementById('mission-breaker-image').value;
        const preview = document.getElementById('mission-breaker-preview');
        if (path) {
            preview.innerHTML = `<img src="${path}" alt="Preview" onerror="this.parentNode.innerHTML='<span class=\\'image-preview-placeholder\\'>Failed to load</span>'">`;
        } else {
            preview.innerHTML = '<span class="image-preview-placeholder">Image preview</span>';
        }
    }

    async handleBreakerImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('mission-breaker-file-name').textContent = file.name;

        try {
            const base64 = await this.fileToBase64(file);
            const response = await fetch(`${this.apiBase}/upload-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: base64,
                    filename: file.name,
                    folder: 'images'
                })
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            document.getElementById('mission-breaker-image').value = result.path;
            this.updateBreakerPreview();
        } catch (error) {
            console.error('Error uploading breaker image:', error);
            alert('Error uploading image: ' + error.message);
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
    }

    async saveBreakerImage() {
        try {
            const breakerImage = document.getElementById('mission-breaker-image').value;
            await missionAPI.updateSettings({ breaker_image: breakerImage });
            alert('Mission breaker image saved successfully!');
        } catch (error) {
            console.error('Error saving breaker image:', error);
            alert('Error saving breaker image: ' + error.message);
        }
    }

    renderStatementsList() {
        if (this.statements.length === 0) {
            this.statementsList.innerHTML = '<div class="loading-message">No statements found. Click "Add Statement" to create one.</div>';
            return;
        }

        this.statementsList.innerHTML = this.statements.map(statement => `
            <div class="mission-statement-card" data-id="${statement.id}" draggable="true">
                <div class="statement-drag-handle">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4H6V6H4V4ZM10 4H12V6H10V4ZM4 7H6V9H4V7ZM10 7H12V9H10V7ZM4 10H6V12H4V10ZM10 10H12V12H10V10Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="statement-preview">
                    <p>${statement.content?.substring(0, 150)}${statement.content?.length > 150 ? '...' : ''}</p>
                    ${statement.full_width ? '<span class="badge">Full Width</span>' : ''}
                </div>
                <div class="statement-actions">
                    <button type="button" class="btn-action btn-edit" data-action="edit" data-id="${statement.id}">Edit</button>
                    <button type="button" class="btn-action btn-delete" data-action="delete" data-id="${statement.id}">Delete</button>
                </div>
            </div>
        `).join('');

        // Add click handlers
        this.statementsList.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => this.showStatementEditor(btn.dataset.id));
        });
        this.statementsList.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => this.showDeleteStatementModal(btn.dataset.id));
        });

        // Setup drag and drop
        this.setupStatementDragDrop();
    }

    setupStatementDragDrop() {
        const cards = this.statementsList.querySelectorAll('.mission-statement-card');
        let draggedItem = null;

        cards.forEach(card => {
            card.addEventListener('dragstart', () => {
                draggedItem = card;
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
                this.updateStatementOrder();
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && draggedItem !== card) {
                    const rect = card.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        card.parentNode.insertBefore(draggedItem, card);
                    } else {
                        card.parentNode.insertBefore(draggedItem, card.nextSibling);
                    }
                }
            });
        });
    }

    async updateStatementOrder() {
        const cards = this.statementsList.querySelectorAll('.mission-statement-card');
        const updates = [];

        cards.forEach((card, index) => {
            const id = card.dataset.id;
            updates.push(missionAPI.upsertStatement({ id, sort_order: index }));
        });

        try {
            await Promise.all(updates);
        } catch (error) {
            console.error('Error updating order:', error);
        }
    }

    showStatementEditor(statementId = null) {
        this.editingStatementId = statementId;
        const title = document.getElementById('mission-statement-modal-title');

        if (statementId) {
            title.textContent = 'Edit Statement';
            const statement = this.statements.find(s => s.id === statementId);
            if (statement) {
                document.getElementById('mission-statement-id').value = statementId;
                document.getElementById('mission-statement-text').value = statement.content || '';
                document.getElementById('mission-statement-fullwidth').checked = statement.full_width || false;
            }
        } else {
            title.textContent = 'Add Statement';
            this.resetStatementForm();
        }

        this.statementModal.hidden = false;
    }

    closeStatementEditor() {
        this.statementModal.hidden = true;
        this.editingStatementId = null;
        this.resetStatementForm();
    }

    resetStatementForm() {
        document.getElementById('mission-statement-id').value = '';
        document.getElementById('mission-statement-text').value = '';
        document.getElementById('mission-statement-fullwidth').checked = false;
    }

    async saveStatement(e) {
        e.preventDefault();

        const item = {
            id: this.editingStatementId || `statement-${Date.now()}`,
            content: document.getElementById('mission-statement-text').value,
            full_width: document.getElementById('mission-statement-fullwidth').checked,
            sort_order: this.editingStatementId ? (this.statements.find(s => s.id === this.editingStatementId)?.sort_order || 0) : this.statements.length
        };

        try {
            await missionAPI.upsertStatement(item);
            await this.loadContent();
            this.renderStatementsList();
            this.closeStatementEditor();
        } catch (error) {
            console.error('Error saving statement:', error);
            alert('Error saving statement: ' + error.message);
        }
    }

    showDeleteStatementModal(statementId) {
        this.deleteStatementId = statementId;
        this.deleteStatementModal.hidden = false;
    }

    closeDeleteStatementModal() {
        this.deleteStatementModal.hidden = true;
        this.deleteStatementId = null;
    }

    async confirmDeleteStatement() {
        if (!this.deleteStatementId) return;

        try {
            await missionAPI.deleteStatement(this.deleteStatementId);
            await this.loadContent();
            this.renderStatementsList();
            this.closeDeleteStatementModal();
        } catch (error) {
            console.error('Error deleting statement:', error);
            alert('Error deleting statement: ' + error.message);
        }
    }

    renderGoalCardsList() {
        if (this.goalCards.length === 0) {
            this.goalCardsList.innerHTML = '<div class="loading-message">No goal cards found.</div>';
            return;
        }

        this.goalCardsList.innerHTML = this.goalCards.map(card => {
            // Use hero image from goal page if available, fall back to card's own image
            const heroImage = card.link ? this.goalPageHeroImages[card.link] : null;
            const displayImage = heroImage || card.image || '';
            return `
            <div class="goal-card-admin" data-id="${card.id}" draggable="true">
                <div class="goal-card-drag-handle">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4H6V6H4V4ZM10 4H12V6H10V4ZM4 7H6V9H4V7ZM10 7H12V9H10V7ZM4 10H6V12H4V10ZM10 10H12V12H10V10Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="goal-card-preview">
                    <div class="goal-card-preview-image" style="background-image: url('${displayImage}');"></div>
                    <div class="goal-card-preview-info">
                        <h4>${card.label || ''} ${card.title || 'Untitled'}</h4>
                        <p>${card.subtitle || ''}</p>
                    </div>
                </div>
                <div class="goal-card-actions">
                    <button type="button" class="btn-action btn-edit" data-action="edit" data-id="${card.id}">Edit</button>
                </div>
            </div>`;
        }).join('');

        // Add click handlers
        this.goalCardsList.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => this.showGoalCardEditor(btn.dataset.id));
        });

        // Setup drag and drop
        this.setupGoalCardDragDrop();
    }

    setupGoalCardDragDrop() {
        const cards = this.goalCardsList.querySelectorAll('.goal-card-admin');
        let draggedItem = null;

        cards.forEach(card => {
            card.addEventListener('dragstart', () => {
                draggedItem = card;
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
                this.updateGoalCardOrder();
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && draggedItem !== card) {
                    const rect = card.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        card.parentNode.insertBefore(draggedItem, card);
                    } else {
                        card.parentNode.insertBefore(draggedItem, card.nextSibling);
                    }
                }
            });
        });
    }

    async updateGoalCardOrder() {
        const cards = this.goalCardsList.querySelectorAll('.goal-card-admin');
        const updates = [];

        cards.forEach((card, index) => {
            const id = card.dataset.id;
            updates.push(missionAPI.upsertGoalCard({ id, sort_order: index }));
        });

        try {
            await Promise.all(updates);
        } catch (error) {
            console.error('Error updating order:', error);
        }
    }

    showGoalCardEditor(cardId) {
        this.editingGoalCardId = cardId;
        document.getElementById('goal-card-modal-title').textContent = 'Edit Goal Card';

        const card = this.goalCards.find(c => c.id === cardId);
        if (card) {
            document.getElementById('goal-card-id').value = cardId;
            document.getElementById('goal-card-label').value = card.label || '';
            document.getElementById('goal-card-title').value = card.title || '';
            document.getElementById('goal-card-subtitle').value = card.subtitle || '';
            document.getElementById('goal-card-description').value = card.description || '';
            document.getElementById('goal-card-image').value = card.image || '';
            document.getElementById('goal-card-link').value = card.link || '';
        }

        this.goalCardModal.hidden = false;
    }

    closeGoalCardEditor() {
        this.goalCardModal.hidden = true;
        this.editingGoalCardId = null;
        this.resetGoalCardForm();
    }

    resetGoalCardForm() {
        document.getElementById('goal-card-id').value = '';
        document.getElementById('goal-card-label').value = '';
        document.getElementById('goal-card-title').value = '';
        document.getElementById('goal-card-subtitle').value = '';
        document.getElementById('goal-card-description').value = '';
        document.getElementById('goal-card-image').value = '';
        document.getElementById('goal-card-link').value = '';
    }

    async saveGoalCard(e) {
        e.preventDefault();

        const item = {
            id: this.editingGoalCardId,
            label: document.getElementById('goal-card-label').value,
            title: document.getElementById('goal-card-title').value,
            subtitle: document.getElementById('goal-card-subtitle').value,
            description: document.getElementById('goal-card-description').value,
            image: document.getElementById('goal-card-image').value,
            link: document.getElementById('goal-card-link').value,
            sort_order: this.goalCards.find(c => c.id === this.editingGoalCardId)?.sort_order || 0
        };

        try {
            await missionAPI.upsertGoalCard(item);
            await this.loadContent();
            this.renderGoalCardsList();
            this.closeGoalCardEditor();
        } catch (error) {
            console.error('Error saving goal card:', error);
            alert('Error saving goal card: ' + error.message);
        }
    }
}


// ============================================================
// Goal Pages Manager
// ============================================================

class GoalPagesManager {
    constructor() {
        this.apiBase = '/.netlify/functions';
        this.pages = [];
        this.editingPageId = null;
        this.deletePageId = null;
        this.fundingItemCount = 0;
        this.galleryImageCount = 0;

        // DOM Elements
        this.pagesList = document.getElementById('goal-pages-list');
        this.editorModal = document.getElementById('goal-page-modal');
        this.deleteModal = document.getElementById('delete-goal-page-modal');
        this.form = document.getElementById('goal-page-form');
        this.fundingContainer = document.getElementById('funding-items-container');
        this.galleryContainer = document.getElementById('goal-gallery-container');

        this.init();
    }

    async init() {
        await this.loadPages();
        this.renderPagesList();
        this.setupEventListeners();
    }

    async loadPages() {
        try {
            this.pages = await goalPagesAPI.getAll();
            console.log('Loaded goal pages:', this.pages);

            // Seed default goal pages if empty
            if (this.pages.length === 0) {
                await this.seedDefaultGoalPages();
            }
        } catch (error) {
            console.error('Error loading goal pages:', error);
            this.pages = [];
        }
    }

    async seedDefaultGoalPages() {
        const defaultPages = [
            {
                id: 'goal-page-1',
                label: 'Goal One:',
                title: 'Batwa Farm at Matanda, Uganda',
                slug: 'goalone.html',
                hero_image: 'images/batwa+farm+lead+photo+news+and+update.jpg',
                content: 'In 2022 approximately 10 acres of very fertile farm land was purchased at Matanda [near Kihihi] Uganda. Elders, families, youth and other members of four Batwa communities were asked if they wanted to participate in a new farming project. After visiting the land with Tweheyo Robert and Mushamba Moses of the Rafiki Memorial Wildlife Conservation Initiative the Batwa people supported the new farm project. In February and March of 2023 the farm project is proceeding with the clearing and plowing and preparation of the land. The first crops will be planted this spring.\n\nIt is our hope for the future that this farm project will provide a sustainable food source for the Batwa families and settlements. Additional farm land may be purchased and farmed by the Batwa families in future years.',
                funding: JSON.stringify([
                    { label: 'Phase one:', amount: 'land purchase $23,000 USD' },
                    { label: 'Phase two:', amount: 'clearing and planting $4,000 USD' }
                ]),
                gallery: JSON.stringify([
                    { src: 'images/batwa+farming.jpg', alt: 'Batwa Farming' },
                    { src: 'images/batwa+farming-4.jpg', alt: 'Batwa Farming' },
                    { src: 'images/group+farm.jpg', alt: 'Group at Farm' },
                    { src: 'images/farming.jpg', alt: 'Farming' },
                    { src: 'images/three+hoes+farm.jpg', alt: 'Farm Work' },
                    { src: 'images/field+walk+farm.jpg', alt: 'Field Walk' },
                    { src: 'images/batwafarm+tractor+clearing+m723.jpg', alt: 'Tractor Clearing' },
                    { src: 'images/batwa+farm+clearing+m723.jpg', alt: 'Farm Clearing' },
                    { src: 'images/batwa+visit+farm+ocf.jpg', alt: 'Batwa Visit Farm' }
                ]),
                sort_order: 0
            },
            {
                id: 'goal-page-2',
                label: 'Goal Two:',
                title: 'Porters at Bwindi',
                slug: 'goaltwo.html',
                hero_image: 'images/porters-03-cropped-1180x437.jpg',
                content: 'Support the development and expansion of food related sustainability project that will allow the porters in one of the four major porter\'s association to supplement the income they receive from tourism.\n\nThis project will be coordinated with the support and project accountability controls of the Rafiki Wildlife Conservation Initiative.\n\nhttp://rafikiwildlife.org/\n\nThe OCF will provide small annual grants to purchase bees for honey and chickens for eggs. A few of the porters have already established 35 bee hives that are producing honey. This project will start with one porter association [Bwindi Bujengwe Porters Association] and if the first project is successful, we may expand to include members of additional porter associations in the future.',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([
                    { src: 'images/porters+in+field.jpg', alt: 'Porters in Field' },
                    { src: 'images/porters+covid+food+2022.jpg', alt: 'Porters COVID Food' },
                    { src: 'images/two+porters+with+hive.jpg', alt: 'Porters with Hive' },
                    { src: 'images/milton+enoth+caleb+porters.jpg', alt: 'Milton Enoth Caleb Porters' }
                ]),
                sort_order: 1
            },
            {
                id: 'goal-page-3',
                label: 'Goal Three:',
                title: 'Health',
                slug: 'goalthree.html',
                hero_image: 'images/img_20211206_100240_1+2.jpg',
                content: 'Develop an emergency reserve fund of $5,000 to be used for future purchases and distribution of foods rich in protein such as maize / corn flour, beans and fruits. Also provide for the purchase of soap, masks, medicine and other emergency supplies.',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([]),
                sort_order: 2
            },
            {
                id: 'goal-page-4',
                label: 'Goal Four:',
                title: 'Technology',
                slug: 'goalfour.html',
                hero_image: 'images/whatsapp+image+2021-09-16+at+10.39.46+pm.jpg',
                content: 'In 2019 - 2022 the OCF provided over $3,500 USD in funding to support the first computers, printers and digital cameras to be used by school children in Bwindi, Uganda. In the future grants will be made to support similar projects in the USA, Canada and other regions of the world.',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([]),
                sort_order: 3
            },
            {
                id: 'goal-page-5',
                label: 'Goal Five:',
                title: 'Fresh Water',
                slug: 'goalfive.html',
                hero_image: 'images/water.jpg',
                content: 'Access to daily fresh drinking water remains a challenge for underserved Native American families throughout the USA and villages throughout the world. The foundation provides support to local families and groups who address this need by drilling fresh water wells, providing water treatment systems, and other alternative strategies.',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([]),
                sort_order: 4
            },
            {
                id: 'goal-page-6',
                label: 'Goal Six:',
                title: 'Education',
                slug: 'goalsix.html',
                hero_image: 'images/unified+basketball+hhs2023.jpg',
                content: 'K-12 and Higher education for children who live in poverty and/or require special education support services exist throughout the United States and the world. The OCF has provided tuition fees for orphan students in Bwindi for their entire elementary education.',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([]),
                sort_order: 5
            },
            {
                id: 'goal-page-7',
                label: 'Goal Seven:',
                title: 'Dreams & Visions - Donor Requests',
                slug: 'goalseven.html',
                hero_image: 'images/linda+mercyjpeg.jpg',
                content: 'Donors who wish to submit a specific request to the OMOTANI CARING FOUNDATION in support of a project or initiative that is meaningful and personal are encouraged to submit a description of the proposal and potential level of funding. DREAMS AND VISIONS = $ UNLIMITED',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([]),
                sort_order: 6
            },
            {
                id: 'goal-page-8',
                label: 'Goal Eight:',
                title: 'The Partners Nepal',
                slug: 'goaleight.html',
                hero_image: 'images/tpn.jpg',
                content: 'Drs. Les and Barbara Omotani [The Omotani Caring Foundation] met Ang Rita Sherpa and Peter Hillary during a 2014 National Geographic Expedition adventure. Throughout the years, Barbara and Les Omotani have provided private donations to support the work of THE PARTNERS NEPAL [TPN].',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([]),
                sort_order: 7
            },
            {
                id: 'goal-page-9',
                label: 'Goal Nine:',
                title: 'Women In Gorilla Conservation',
                slug: 'goalnine.html',
                hero_image: 'images/womengorilla.png',
                content: 'The Omotani Caring Foundation is pleased to collaborate with Sahaya International and the Rafiki Memorial Wildlife Conservation Initiative to support a project initiated by Robinah Gangiriba [Warden of Tourism of the Ugandan Wildlife Authority].',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([]),
                sort_order: 8
            },
            {
                id: 'goal-page-10',
                label: 'Goal Ten:',
                title: 'Base Camp for Veterans',
                slug: 'goalten.html',
                hero_image: 'images/img_8315.jpg',
                content: 'BaseCamp for Veterans, Inc. ("BCI") was founded by life-long friends Deborah Plum & Theo Windish, who each have experience in both the private and public sectors, and who have spent a significant portion of their professional lives connecting people, being a part of charitable groups, and investing their time in projects that served a variety of communities.\n\nThe desire to create something sustainable that truly gives back to generations of people, combined with a palpable awareness of the noticeable decline in comprehensive veteran services, particularly ones that include families as part of the process, led Theo and Deborah to conclude that the veteran community was where they needed to focus their energy.\n\nOur Mission: To respond to the needs of those who serve our nation and protect its values, by promoting personal and professional growth, and contributing to an effective, sustainable path towards reintegration.\n\nhttps://www.bcampinc.com/about\n\nFacebook: BaseCamp for Veterans - https://www.facebook.com/BaseCampforVeteransInc\n\nThe Omotani Caring Foundation [OCF] has been pleased to provide support to BCI for 2024, 2025 and beyond. In particular we have supported the work of the mustang trainer, Randy Helm, and his work with introducing the veterans to the unique connection available with mustangs.',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([
                    { src: 'images/img_8308.jpg', alt: 'Base Camp for Veterans' },
                    { src: 'images/bcfv.png', alt: 'BCI Logo' },
                    { src: 'images/basecampveterans-picture6.jpg', alt: 'Veterans Program' },
                    { src: 'images/basecampveterans-picture7.jpg', alt: 'Mustang Training' },
                    { src: 'images/basecampveterans-picture9.jpg', alt: 'Veterans Training' },
                    { src: 'images/basecampveterans-picture11.jpg', alt: 'BCI Program' }
                ]),
                sort_order: 9
            },
            {
                id: 'goal-page-11',
                label: 'Goal Eleven:',
                title: 'Randy Helm Horsemanship',
                slug: 'goaleleven.html',
                hero_image: 'images/randyhelm.jpg',
                content: 'We are pleased to support Randy Helm and his continuing work to train wild mustangs and to support a wide variety of people to learn how to be good and great horsemanship learners and riders. Randy has successfully led the State of Arizona\'s Wild Horse Inmate program and is a facilitator with Base Camp for Veterans.',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([]),
                sort_order: 10
            },
            {
                id: 'goal-page-12',
                label: 'Goal Twelve:',
                title: 'High Asia Habitat Fund',
                slug: 'goaltwelve.html',
                hero_image: 'images/goal12.jpg',
                content: 'The Omotani Caring Foundation is pleased to become a supporter of the High Asia Habitat Fund. The founder of HAHF, Behzad Larry, is committed to the conservation of the snow leopards and other wildlife in the region. HAHF is also supporting the training of local people to help them and their cattle coexist with wildlife in the remote regions of the high Himalayan mountains.',
                funding: JSON.stringify([]),
                gallery: JSON.stringify([]),
                sort_order: 11
            }
        ];

        try {
            for (const page of defaultPages) {
                await goalPagesAPI.upsert(page);
            }
            this.pages = defaultPages;
        } catch (error) {
            console.error('Error seeding default goal pages:', error);
        }
    }

    setupEventListeners() {
        // Add page
        document.getElementById('add-goal-page-btn').addEventListener('click', () => this.showEditor());

        // Form
        this.form.addEventListener('submit', (e) => this.savePage(e));
        document.getElementById('cancel-goal-page').addEventListener('click', () => this.closeEditor());

        // Add funding item
        document.getElementById('add-funding-item-btn').addEventListener('click', () => this.addFundingItem());

        // Add gallery image
        document.getElementById('add-goal-gallery-image-btn').addEventListener('click', () => this.addGalleryImage());

        // Delete modal
        document.getElementById('cancel-goal-page-delete').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-goal-page-delete').addEventListener('click', () => this.confirmDelete());

        // Close modals
        this.editorModal.querySelector('.modal-close').addEventListener('click', () => this.closeEditor());
        this.editorModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeEditor());

        // Hero image preview
        document.getElementById('goal-page-hero').addEventListener('input', () => this.updateHeroPreview());

        // Hero image file upload
        const heroFileInput = document.getElementById('goal-page-hero-file');
        if (heroFileInput) {
            heroFileInput.addEventListener('change', (e) => this.handleHeroUpload(e));
        }
    }

    async handleHeroUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const fileNameEl = document.getElementById('goal-page-hero-file-name');
        if (fileNameEl) fileNameEl.textContent = 'Uploading...';

        try {
            const base64 = await this.fileToBase64(file);
            // Get the current page slug for folder organization, strip .html extension
            const rawSlug = document.getElementById('goal-page-slug').value || 'goal-heroes';
            const slug = rawSlug.replace('.html', '');

            const response = await fetch(`${this.apiBase}/upload-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: base64,
                    filename: file.name,
                    mimeType: file.type,
                    postId: slug,
                    fileType: 'image'
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            document.getElementById('goal-page-hero').value = result.path;
            this.updateHeroPreview();
            if (fileNameEl) fileNameEl.textContent = file.name;
        } catch (error) {
            console.error('Error uploading hero image:', error);
            alert('Error uploading image: ' + error.message);
            if (fileNameEl) fileNameEl.textContent = 'Upload failed';
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Strip the data URL prefix (e.g., "data:image/jpeg;base64,")
                const result = reader.result;
                const base64 = result.split(',')[1] || result;
                resolve(base64);
            };
            reader.onerror = reject;
        });
    }

    async handleGalleryImageUpload(e, index) {
        const file = e.target.files[0];
        if (!file) return;

        const fileNameEl = document.getElementById(`gallery-file-name-${index}`);
        if (fileNameEl) fileNameEl.textContent = 'Uploading...';

        try {
            const base64 = await this.fileToBase64(file);
            // Get the current page slug for folder organization, strip .html extension
            const rawSlug = document.getElementById('goal-page-slug').value || 'goal-images';
            const slug = rawSlug.replace('.html', '');

            const response = await fetch(`${this.apiBase}/upload-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: base64,
                    filename: file.name,
                    mimeType: file.type,
                    postId: slug,
                    fileType: 'image'
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            const srcInput = document.querySelector(`[name="gallery-src-${index}"]`);
            if (srcInput) srcInput.value = result.path;

            // Update preview
            const preview = document.getElementById(`gallery-preview-${index}`);
            if (preview) {
                preview.innerHTML = `<img src="${result.path}" alt="Preview" onerror="this.parentNode.innerHTML='<span class=\\'image-preview-placeholder\\'>Failed to load</span>'">`;
            }

            if (fileNameEl) fileNameEl.textContent = file.name;
        } catch (error) {
            console.error('Error uploading gallery image:', error);
            alert('Error uploading image: ' + error.message);
            if (fileNameEl) fileNameEl.textContent = 'Upload failed';
        }
    }

    updateHeroPreview() {
        const path = document.getElementById('goal-page-hero').value;
        const preview = document.getElementById('goal-page-hero-preview');
        if (path) {
            preview.innerHTML = `<img src="${path}" alt="Preview" onerror="this.parentNode.innerHTML='<span class=\\'image-preview-placeholder\\'>Failed to load</span>'">`;
        } else {
            preview.innerHTML = '<span class="image-preview-placeholder">Image preview</span>';
        }
    }

    renderPagesList() {
        if (this.pages.length === 0) {
            this.pagesList.innerHTML = '<div class="loading-message">No goal pages found. Click "Add Goal Page" to create one.</div>';
            return;
        }

        this.pagesList.innerHTML = this.pages.map(page => `
            <div class="goal-page-card" data-id="${page.id}" draggable="true">
                <div class="goal-page-drag-handle">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4H6V6H4V4ZM10 4H12V6H10V4ZM4 7H6V9H4V7ZM10 7H12V9H10V7ZM4 10H6V12H4V10ZM10 10H12V12H10V10Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="goal-page-preview">
                    <div class="goal-page-preview-image" style="background-image: url('${page.hero_image || ''}');"></div>
                    <div class="goal-page-preview-info">
                        <h4>${page.label || ''} ${page.title || 'Untitled'}</h4>
                        <p>${page.slug || ''}</p>
                    </div>
                </div>
                <div class="goal-page-actions">
                    <a href="${page.slug}" target="_blank" class="btn-action btn-view">View</a>
                    <button type="button" class="btn-action btn-edit" data-action="edit" data-id="${page.id}">Edit</button>
                    <button type="button" class="btn-action btn-delete" data-action="delete" data-id="${page.id}">Delete</button>
                </div>
            </div>
        `).join('');

        // Add click handlers
        this.pagesList.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => this.showEditor(btn.dataset.id));
        });
        this.pagesList.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => this.showDeleteModal(btn.dataset.id));
        });

        // Setup drag and drop
        this.setupDragDrop();
    }

    setupDragDrop() {
        const cards = this.pagesList.querySelectorAll('.goal-page-card');
        let draggedItem = null;

        cards.forEach(card => {
            card.addEventListener('dragstart', () => {
                draggedItem = card;
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
                this.updateOrder();
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && draggedItem !== card) {
                    const rect = card.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        card.parentNode.insertBefore(draggedItem, card);
                    } else {
                        card.parentNode.insertBefore(draggedItem, card.nextSibling);
                    }
                }
            });
        });
    }

    async updateOrder() {
        const cards = this.pagesList.querySelectorAll('.goal-page-card');
        const updates = [];

        cards.forEach((card, index) => {
            const id = card.dataset.id;
            updates.push(goalPagesAPI.update(id, { sort_order: index }));
        });

        try {
            await Promise.all(updates);
        } catch (error) {
            console.error('Error updating order:', error);
        }
    }

    showEditor(pageId = null) {
        this.editingPageId = pageId;
        const title = document.getElementById('goal-page-modal-title');

        if (pageId) {
            title.textContent = 'Edit Goal Page';
            const page = this.pages.find(p => p.id === pageId);
            if (page) {
                document.getElementById('goal-page-id').value = pageId;
                document.getElementById('goal-page-label').value = page.label || '';
                document.getElementById('goal-page-title').value = page.title || '';
                document.getElementById('goal-page-slug').value = page.slug || '';
                document.getElementById('goal-page-hero').value = page.hero_image || '';
                document.getElementById('goal-page-hero-position').value = page.hero_position || 'center';
                document.getElementById('goal-page-content').value = page.content || '';

                // Load funding items
                const funding = typeof page.funding === 'string' ? JSON.parse(page.funding || '[]') : (page.funding || []);
                this.fundingContainer.innerHTML = '';
                this.fundingItemCount = 0;
                funding.forEach(item => this.addFundingItem(item));

                // Load gallery images
                let gallery = [];
                try {
                    if (page.gallery) {
                        gallery = typeof page.gallery === 'string' ? JSON.parse(page.gallery) : page.gallery;
                        // Handle case where it might be double-encoded
                        if (typeof gallery === 'string') {
                            gallery = JSON.parse(gallery);
                        }
                    }
                    console.log('Loading gallery for page:', page.title, 'Gallery data:', gallery);
                } catch (e) {
                    console.error('Error parsing gallery data:', e, 'Raw data:', page.gallery);
                    gallery = [];
                }
                this.galleryContainer.innerHTML = '';
                this.galleryImageCount = 0;
                if (Array.isArray(gallery) && gallery.length > 0) {
                    gallery.forEach(img => this.addGalleryImage(img));
                } else {
                    console.log('No gallery images found for this page. Gallery data was:', page.gallery);
                }

                this.updateHeroPreview();
            }
        } else {
            title.textContent = 'Add Goal Page';
            this.resetForm();
        }

        this.editorModal.hidden = false;
    }

    closeEditor() {
        this.editorModal.hidden = true;
        this.editingPageId = null;
        this.resetForm();
    }

    resetForm() {
        document.getElementById('goal-page-id').value = '';
        document.getElementById('goal-page-label').value = '';
        document.getElementById('goal-page-title').value = '';
        document.getElementById('goal-page-slug').value = '';
        document.getElementById('goal-page-hero').value = '';
        document.getElementById('goal-page-hero-position').value = 'center';
        document.getElementById('goal-page-content').value = '';
        this.fundingContainer.innerHTML = '';
        this.fundingItemCount = 0;
        this.galleryContainer.innerHTML = '';
        this.galleryImageCount = 0;
        this.updateHeroPreview();
    }

    addFundingItem(data = {}) {
        const index = this.fundingItemCount++;
        const html = `
            <div class="funding-item media-item" data-index="${index}">
                <div class="media-item-header">
                    <span class="media-item-number">Phase ${index + 1}</span>
                    <button type="button" class="btn-remove-item" onclick="this.closest('.funding-item').remove()" title="Remove this phase">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 3.5H13M5.5 6.5V10.5M8.5 6.5V10.5M2 3.5L3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12L12 3.5M4.5 3.5V2C4.5 1.44772 4.94772 1 5.5 1H8.5C9.05228 1 9.5 1.44772 9.5 2V3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Remove
                    </button>
                </div>
                <div class="form-row two-col">
                    <div class="form-group">
                        <label>Phase Label</label>
                        <input type="text" name="funding-label-${index}" value="${data.label || ''}" placeholder="Phase one:">
                    </div>
                    <div class="form-group">
                        <label>Amount</label>
                        <input type="text" name="funding-amount-${index}" value="${data.amount || ''}" placeholder="$23,000 USD">
                    </div>
                </div>
            </div>
        `;
        this.fundingContainer.insertAdjacentHTML('beforeend', html);
    }

    addGalleryImage(data = {}) {
        const index = this.galleryImageCount++;
        const previewHtml = data.src
            ? `<img src="${data.src}" alt="Preview" onerror="this.parentNode.innerHTML='<span class=\\'image-preview-placeholder\\'>Failed to load</span>'">`
            : '<span class="image-preview-placeholder">Image preview</span>';
        const html = `
            <div class="gallery-image-item media-item" data-index="${index}">
                <div class="media-item-header">
                    <span class="media-item-number">Image ${index + 1}</span>
                    <button type="button" class="btn-remove-item" onclick="this.closest('.gallery-image-item').remove()" title="Remove this image">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 3.5H13M5.5 6.5V10.5M8.5 6.5V10.5M2 3.5L3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12L12 3.5M4.5 3.5V2C4.5 1.44772 4.94772 1 5.5 1H8.5C9.05228 1 9.5 1.44772 9.5 2V3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Remove
                    </button>
                </div>
                <div class="form-row gallery-image-row">
                    <div class="image-preview gallery-item-preview" id="gallery-preview-${index}">
                        ${previewHtml}
                    </div>
                    <div class="gallery-image-fields">
                        <div class="form-group">
                            <label>Image Path</label>
                            <input type="text" name="gallery-src-${index}" value="${data.src || ''}" placeholder="images/photo.jpg" oninput="document.getElementById('gallery-preview-${index}').innerHTML = this.value ? '<img src=\\'' + this.value + '\\' alt=\\'Preview\\' onerror=\\'this.parentNode.innerHTML=&quot;<span class=image-preview-placeholder>Failed to load</span>&quot;\\'>' : '<span class=image-preview-placeholder>Image preview</span>'">
                        </div>
                        <div class="form-group">
                            <label>Alt Text</label>
                            <input type="text" name="gallery-alt-${index}" value="${data.alt || ''}" placeholder="Description of the image">
                        </div>
                        <div class="file-upload-wrapper">
                            <input type="file" id="gallery-file-${index}" accept="image/jpeg,image/png,image/gif,image/webp" class="file-input" onchange="window.goalPagesManager.handleGalleryImageUpload(event, ${index})">
                            <label for="gallery-file-${index}" class="file-upload-btn">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 11V3M8 3L5 6M8 3L11 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M2 11V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span>Upload</span>
                            </label>
                            <span class="file-name" id="gallery-file-name-${index}">No file chosen</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.galleryContainer.insertAdjacentHTML('beforeend', html);
    }

    collectFundingItems() {
        const items = [];
        this.fundingContainer.querySelectorAll('.funding-item').forEach(item => {
            const index = item.dataset.index;
            const label = item.querySelector(`[name="funding-label-${index}"]`)?.value || '';
            const amount = item.querySelector(`[name="funding-amount-${index}"]`)?.value || '';
            if (label || amount) {
                items.push({ label, amount });
            }
        });
        return items;
    }

    collectGalleryImages() {
        const images = [];
        this.galleryContainer.querySelectorAll('.gallery-image-item').forEach(item => {
            const index = item.dataset.index;
            const src = item.querySelector(`[name="gallery-src-${index}"]`)?.value || '';
            const alt = item.querySelector(`[name="gallery-alt-${index}"]`)?.value || '';
            if (src) {
                images.push({ src, alt });
            }
        });
        return images;
    }

    async savePage(e) {
        e.preventDefault();

        const item = {
            id: this.editingPageId || `goal-${Date.now()}`,
            label: document.getElementById('goal-page-label').value,
            title: document.getElementById('goal-page-title').value,
            slug: document.getElementById('goal-page-slug').value,
            hero_image: document.getElementById('goal-page-hero').value,
            hero_position: document.getElementById('goal-page-hero-position').value,
            content: document.getElementById('goal-page-content').value,
            funding: JSON.stringify(this.collectFundingItems()),
            gallery: JSON.stringify(this.collectGalleryImages()),
            sort_order: this.editingPageId ? (this.pages.find(p => p.id === this.editingPageId)?.sort_order || 0) : this.pages.length
        };

        try {
            await goalPagesAPI.upsert(item);
            await this.loadPages();
            this.renderPagesList();
            this.closeEditor();
        } catch (error) {
            console.error('Error saving goal page:', error);
            alert('Error saving goal page: ' + error.message);
        }
    }

    showDeleteModal(pageId) {
        this.deletePageId = pageId;
        const page = this.pages.find(p => p.id === pageId);
        document.getElementById('delete-goal-page-title').textContent = `Are you sure you want to delete "${page?.title || 'this page'}"?`;
        this.deleteModal.hidden = false;
    }

    closeDeleteModal() {
        this.deleteModal.hidden = true;
        this.deletePageId = null;
    }

    async confirmDelete() {
        if (!this.deletePageId) return;

        try {
            await goalPagesAPI.delete(this.deletePageId);
            await this.loadPages();
            this.renderPagesList();
            this.closeDeleteModal();
        } catch (error) {
            console.error('Error deleting page:', error);
            alert('Error deleting page: ' + error.message);
        }
    }
}


// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    new AdminDashboard();
    new GalleryManager();
    new ProgressManager();
    new AboutManager();
    new MissionManager();
    // Expose goalPagesManager globally for inline handlers
    window.goalPagesManager = new GoalPagesManager();
});
