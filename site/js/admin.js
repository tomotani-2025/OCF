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
        await this.loadGallery();
        this.renderGalleryGrid();
        this.setupEventListeners();
    }

    async loadGallery() {
        try {
            // Fetch from Supabase
            const [images, categories] = await Promise.all([
                galleryAPI.getImages(),
                galleryAPI.getCategories()
            ]);

            // Transform snake_case to camelCase
            this.gallery = {
                categories: categories.map(cat => ({
                    id: cat.id,
                    label: cat.label,
                    order: cat.sort_order
                })),
                images: images.map(img => ({
                    id: img.id,
                    src: img.src,
                    alt: img.alt,
                    caption: img.caption,
                    category: img.category,
                    order: img.sort_order
                }))
            };
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
        const galleryFileInput = document.getElementById('gallery-image-file');
        galleryFileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Make the custom button trigger the hidden file input
        const galleryFileBtn = this.editorModal.querySelector('.file-upload-btn');
        galleryFileBtn.addEventListener('click', () => galleryFileInput.click());

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
            spinnerIcon.style.display = 'none';
            successIcon.style.display = 'inline';
            btnText.textContent = 'Published!';
            btn.classList.add('btn-success');

            this.hasUnsavedChanges = false;
            this.updateSaveButton();

            // Reset button after delay
            setTimeout(() => {
                defaultIcon.style.display = 'inline';
                successIcon.style.display = 'none';
                btnText.textContent = 'Publish Changes';
                btn.classList.remove('btn-success');
                btn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Save error:', error);
            // Show error state
            spinnerIcon.style.display = 'none';
            defaultIcon.style.display = 'inline';
            btnText.textContent = 'Error - Try Again';
            btn.classList.add('btn-error');
            btn.disabled = false;

            // Reset button after delay
            setTimeout(() => {
                btnText.textContent = 'Publish Changes';
                btn.classList.remove('btn-error');
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
        await this.loadContent();
        this.renderAdvisorsList();
        this.setupEventListeners();
    }

    async loadContent() {
        try {
            const content = await aboutAPI.getContent();

            // Find trustees
            const trusteesItem = content.find(c => c.type === 'trustees');
            if (trusteesItem) {
                this.trustees = trusteesItem;
                this.trusteesTextarea.value = trusteesItem.content || '';
            }

            // Find advisors
            this.advisors = content.filter(c => c.type === 'advisor').sort((a, b) => a.sort_order - b.sort_order);
        } catch (error) {
            console.error('Error loading about content:', error);
            this.advisors = [];
        }
    }

    setupEventListeners() {
        // Save trustees
        document.getElementById('save-trustees-btn').addEventListener('click', () => this.saveTrustees());

        // Add advisor
        document.getElementById('add-advisor-btn').addEventListener('click', () => this.showEditor());

        // Form
        this.form.addEventListener('submit', (e) => this.saveAdvisor(e));
        document.getElementById('cancel-advisor-edit').addEventListener('click', () => this.closeEditor());

        // Delete modal
        document.getElementById('cancel-advisor-delete').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-advisor-delete').addEventListener('click', () => this.confirmDelete());

        // Close modals
        this.editorModal.querySelector('.modal-close').addEventListener('click', () => this.closeEditor());
        this.editorModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeEditor());

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
        this.editingAdvisorId = advisorId;
        const title = document.getElementById('advisor-editor-title');

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
                document.getElementById('advisor-partner-logo').value = data.partnerLogo || '';
                document.getElementById('advisor-partner-name').value = data.partnerName || '';
                document.getElementById('advisor-tall-card').checked = data.tallCard || false;
                this.updatePhotoPreview();
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
        document.getElementById('advisor-partner-logo').value = '';
        document.getElementById('advisor-partner-name').value = '';
        document.getElementById('advisor-tall-card').checked = false;
        document.getElementById('advisor-photo-file-name').textContent = 'No file chosen';
        this.updatePhotoPreview();
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

    async saveAdvisor(e) {
        e.preventDefault();

        const linksText = document.getElementById('advisor-links').value;
        const links = linksText.split('\n').filter(l => l.trim()).map(line => {
            const [label, url] = line.split('|');
            return { label: label?.trim() || '', url: url?.trim() || '' };
        });

        const data = {
            name: document.getElementById('advisor-name').value,
            title: document.getElementById('advisor-title').value,
            photo: document.getElementById('advisor-photo').value,
            bio: document.getElementById('advisor-bio').value,
            links: links,
            partnerLogo: document.getElementById('advisor-partner-logo').value,
            partnerName: document.getElementById('advisor-partner-name').value,
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
            this.statements = await missionAPI.getStatements();
            this.goalCards = await missionAPI.getGoalCards();
            this.settings = await missionAPI.getSettings();

            // Load mission breaker image
            if (this.settings?.breaker_image) {
                document.getElementById('mission-breaker-image').value = this.settings.breaker_image;
                this.updateBreakerPreview();
            }
        } catch (error) {
            console.error('Error loading mission content:', error);
            this.statements = [];
            this.goalCards = [];
        }
    }

    setupEventListeners() {
        // Save breaker image
        document.getElementById('save-mission-breaker-btn').addEventListener('click', () => this.saveBreakerImage());

        // Breaker image preview
        document.getElementById('mission-breaker-image').addEventListener('input', () => this.updateBreakerPreview());

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

        this.goalCardsList.innerHTML = this.goalCards.map(card => `
            <div class="goal-card-admin" data-id="${card.id}" draggable="true">
                <div class="goal-card-drag-handle">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4H6V6H4V4ZM10 4H12V6H10V4ZM4 7H6V9H4V7ZM10 7H12V9H10V7ZM4 10H6V12H4V10ZM10 10H12V12H10V10Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="goal-card-preview">
                    <div class="goal-card-preview-image" style="background-image: url('${card.image || ''}');"></div>
                    <div class="goal-card-preview-info">
                        <h4>${card.label || ''} ${card.title || 'Untitled'}</h4>
                        <p>${card.subtitle || ''}</p>
                    </div>
                </div>
                <div class="goal-card-actions">
                    <button type="button" class="btn-action btn-edit" data-action="edit" data-id="${card.id}">Edit</button>
                </div>
            </div>
        `).join('');

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
        } catch (error) {
            console.error('Error loading goal pages:', error);
            this.pages = [];
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
                document.getElementById('goal-page-content').value = page.content || '';

                // Load funding items
                const funding = typeof page.funding === 'string' ? JSON.parse(page.funding || '[]') : (page.funding || []);
                this.fundingContainer.innerHTML = '';
                this.fundingItemCount = 0;
                funding.forEach(item => this.addFundingItem(item));

                // Load gallery images
                const gallery = typeof page.gallery === 'string' ? JSON.parse(page.gallery || '[]') : (page.gallery || []);
                this.galleryContainer.innerHTML = '';
                this.galleryImageCount = 0;
                gallery.forEach(img => this.addGalleryImage(img));

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
                <button type="button" class="btn-remove-media" onclick="this.closest('.funding-item').remove()">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `;
        this.fundingContainer.insertAdjacentHTML('beforeend', html);
    }

    addGalleryImage(data = {}) {
        const index = this.galleryImageCount++;
        const html = `
            <div class="gallery-image-item media-item" data-index="${index}">
                <div class="form-row two-col">
                    <div class="form-group">
                        <label>Image Path</label>
                        <input type="text" name="gallery-src-${index}" value="${data.src || ''}" placeholder="images/photo.jpg">
                    </div>
                    <div class="form-group">
                        <label>Alt Text</label>
                        <input type="text" name="gallery-alt-${index}" value="${data.alt || ''}" placeholder="Description">
                    </div>
                </div>
                <button type="button" class="btn-remove-media" onclick="this.closest('.gallery-image-item').remove()">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
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
    new GoalPagesManager();
});
