/**
 * Admin Dashboard for Omotani Caring Foundation
 *
 * Features:
 * - View all posts in a table
 * - Create new posts
 * - Edit existing posts
 * - Delete posts
 * - Search and filter posts
 * - Export full JSON file
 */

class AdminDashboard {
    constructor() {
        this.dataUrl = 'data/news-posts.json?v=' + Date.now();
        this.posts = [];
        this.filteredPosts = [];
        this.editingPostId = null;
        this.deletePostId = null;

        // DOM Elements
        this.dashboard = document.getElementById('posts-dashboard');
        this.editor = document.getElementById('post-editor');
        this.form = document.getElementById('post-form');
        this.imagesContainer = document.getElementById('images-container');
        this.videosContainer = document.getElementById('videos-container');
        this.pdfsContainer = document.getElementById('pdfs-container');
        this.previewModal = document.getElementById('preview-modal');
        this.previewContainer = document.getElementById('preview-container');
        this.jsonModal = document.getElementById('json-modal');
        this.jsonCode = document.querySelector('#json-code code');
        this.deleteModal = document.getElementById('delete-modal');

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
        this.form.addEventListener('submit', (e) => this.savePost(e));

        // Modal actions
        document.getElementById('copy-json-btn').addEventListener('click', () => this.copyJson());
        document.getElementById('download-full-json-btn').addEventListener('click', () => this.downloadFullJson());
        document.getElementById('cancel-delete-btn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-delete-btn').addEventListener('click', () => this.confirmDelete());
        document.getElementById('download-after-delete-btn')?.addEventListener('click', () => this.downloadFullJson());

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

        const title = document.getElementById('editor-title');
        const subtitle = document.getElementById('editor-subtitle');
        const saveBtn = document.getElementById('save-btn');

        if (postId) {
            title.textContent = 'Edit Post';
            subtitle.textContent = 'Make changes to the post. Save to see the updated JSON.';
            saveBtn.textContent = 'Update Post';
            this.loadPostIntoForm(postId);
        } else {
            title.textContent = 'Create New Post';
            subtitle.textContent = 'Fill out the form below. Save to generate the JSON.';
            saveBtn.textContent = 'Save Post';
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
    }

    // ========================================
    // Media Management
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
            <div class="form-row two-col">
                <div class="form-group">
                    <label for="image-src-${index}">Image Path *</label>
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
    }

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
                    <label for="pdf-url-${index}">PDF URL *</label>
                    <input type="url" id="pdf-url-${index}" name="pdf-url-${index}"
                           placeholder="https://www.omotanicaringfoundation.com/s/document.pdf" value="${url}">
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
    }

    removeMediaItem(item, type) {
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
    // Save Post
    // ========================================

    savePost(e) {
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

        const postData = this.collectFormData();
        const cleanData = this.cleanObject(postData);

        // Update local posts array
        if (this.editingPostId) {
            const index = this.posts.findIndex(p => p.id === this.editingPostId);
            if (index !== -1) {
                this.posts[index] = cleanData;
            }
        } else {
            this.posts.unshift(cleanData);
        }

        this.filteredPosts = [...this.posts];
        this.showJsonModal(cleanData, this.editingPostId ? 'update' : 'create');
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
    // JSON Modal
    // ========================================

    showJsonModal(postData, action) {
        const modalTitle = document.getElementById('json-modal-title');
        const instructions = document.getElementById('json-instructions');

        if (action === 'create') {
            modalTitle.textContent = 'New Post Created';
            instructions.innerHTML = `
                <p><strong>To add this post to your site:</strong></p>
                <ol>
                    <li>Click "Download Full news-posts.json" below</li>
                    <li>Replace the file at <code>data/news-posts.json</code> with the downloaded file</li>
                    <li>Commit and deploy the changes</li>
                </ol>
            `;
        } else {
            modalTitle.textContent = 'Post Updated';
            instructions.innerHTML = `
                <p><strong>To save your changes:</strong></p>
                <ol>
                    <li>Click "Download Full news-posts.json" below</li>
                    <li>Replace the file at <code>data/news-posts.json</code> with the downloaded file</li>
                    <li>Commit and deploy the changes</li>
                </ol>
            `;
        }

        const jsonString = JSON.stringify(postData, null, 2);
        this.jsonCode.textContent = jsonString;

        this.jsonModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    copyJson() {
        const jsonText = this.jsonCode.textContent;
        navigator.clipboard.writeText(jsonText).then(() => {
            const btn = document.getElementById('copy-json-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = originalText, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy. Please select and copy manually.');
        });
    }

    downloadFullJson() {
        const fullData = { posts: this.posts };
        const jsonString = JSON.stringify(fullData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'news-posts.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========================================
    // Delete Post
    // ========================================

    showDeleteModal(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        this.deletePostId = postId;
        document.getElementById('delete-post-title').textContent = `Are you sure you want to delete "${post.title}"?`;
        document.getElementById('delete-instructions').hidden = true;
        document.getElementById('confirm-delete-btn').hidden = false;

        this.deleteModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    closeDeleteModal() {
        this.deleteModal.hidden = true;
        document.body.style.overflow = '';
        this.deletePostId = null;
    }

    confirmDelete() {
        if (!this.deletePostId) return;

        const index = this.posts.findIndex(p => p.id === this.deletePostId);
        if (index !== -1) {
            this.posts.splice(index, 1);
            this.filteredPosts = [...this.posts];
            this.renderPostsTable();
        }

        // Show download instructions
        document.getElementById('confirm-delete-btn').hidden = true;
        document.getElementById('delete-instructions').hidden = false;
        document.getElementById('delete-post-title').textContent = 'Post deleted from local data.';
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
        this.jsonModal.hidden = true;
        this.deleteModal.hidden = true;
        document.body.style.overflow = '';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});
