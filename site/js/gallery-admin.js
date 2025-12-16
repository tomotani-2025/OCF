/**
 * Gallery Admin Panel for Omotani Caring Foundation
 *
 * Features:
 * - Album management (create, edit, delete with warnings)
 * - Image management (upload, edit metadata, move, duplicate)
 * - Rich metadata support (title, caption, category, photographer, date, location, tags)
 * - Cover image selection
 * - Drag-and-drop reordering
 */

class GalleryAdmin {
    constructor() {
        this.albums = [];
        this.currentAlbum = null;
        this.currentImages = [];
        this.editingAlbum = null;
        this.editingImage = null;
        this.deleteAlbumId = null;
        this.deleteImageId = null;

        // View states
        this.currentView = 'albums'; // 'albums' or 'images'

        // DOM elements
        this.albumsView = document.getElementById('gallery-albums-view');
        this.imagesView = document.getElementById('gallery-images-view');
        this.albumsList = document.getElementById('albums-list');
        this.imagesList = document.getElementById('images-list');

        this.init();
    }

    async init() {
        await this.loadAlbums();
        this.renderAlbums();
        this.setupEventListeners();
    }

    // ========================================
    // Data Loading
    // ========================================

    async loadAlbums() {
        try {
            this.albums = await galleryAPI.getAllAlbums();

            // Load image counts for each album
            for (const album of this.albums) {
                album.imageCount = await galleryAPI.getAlbumImageCount(album.id);
            }
        } catch (error) {
            console.error('Error loading albums:', error);
            this.showError('Failed to load albums');
        }
    }

    async loadAlbumImages(albumId) {
        try {
            this.currentImages = await galleryAPI.getImagesByAlbum(albumId);
            this.currentAlbum = this.albums.find(a => a.id === albumId);
        } catch (error) {
            console.error('Error loading album images:', error);
            this.showError('Failed to load album images');
        }
    }

    // ========================================
    // Event Listeners
    // ========================================

    setupEventListeners() {
        // Album actions
        document.getElementById('create-album-btn')?.addEventListener('click', () => this.showAlbumEditor());
        document.getElementById('back-to-albums')?.addEventListener('click', () => this.showAlbumsView());

        // Image actions
        document.getElementById('add-images-btn')?.addEventListener('click', () => this.showImageUploader());
        document.getElementById('bulk-add-images-btn')?.addEventListener('click', () => this.showBulkUploader());

        // Album editor modal
        document.getElementById('album-form')?.addEventListener('submit', (e) => this.saveAlbum(e));
        document.getElementById('cancel-album-edit')?.addEventListener('click', () => this.hideAlbumEditor());
        document.querySelector('#album-editor-modal .modal-close')?.addEventListener('click', () => this.hideAlbumEditor());

        // Image editor modal
        document.getElementById('image-form')?.addEventListener('submit', (e) => this.saveImage(e));
        document.getElementById('cancel-image-edit')?.addEventListener('click', () => this.hideImageEditor());
        document.querySelector('#image-editor-modal .modal-close')?.addEventListener('click', () => this.hideImageEditor());

        // Image upload preview
        document.getElementById('image-file')?.addEventListener('change', (e) => this.handleImageFileSelect(e));

        // Delete modals
        document.getElementById('cancel-album-delete')?.addEventListener('click', () => this.hideDeleteAlbumModal());
        document.getElementById('confirm-album-delete')?.addEventListener('click', () => this.confirmDeleteAlbum());
        document.getElementById('cancel-image-delete')?.addEventListener('click', () => this.hideDeleteImageModal());
        document.getElementById('confirm-image-delete')?.addEventListener('click', () => this.confirmDeleteImage());

        // Image actions modal
        document.querySelector('#image-actions-modal .image-actions-close')?.addEventListener('click', () => this.hideImageActionsModal());

        // Cover image selector
        document.getElementById('select-cover-image-btn')?.addEventListener('click', () => this.showCoverImageSelector());

        // Bulk selection mode
        document.getElementById('bulk-select-mode')?.addEventListener('change', (e) => this.toggleBulkSelectMode(e.target.checked));
        document.getElementById('bulk-move-btn')?.addEventListener('click', () => this.bulkMoveImages());
        document.getElementById('bulk-delete-btn')?.addEventListener('click', () => this.bulkDeleteImages());

        // Search and filter
        document.getElementById('search-images')?.addEventListener('input', (e) => this.filterImages(e.target.value));
        document.getElementById('filter-category')?.addEventListener('change', (e) => this.filterByCategory(e.target.value));
    }

    // ========================================
    // View Management
    // ========================================

    showAlbumsView() {
        this.currentView = 'albums';
        this.albumsView.hidden = false;
        this.imagesView.hidden = true;
        this.renderAlbums();
    }

    showImagesView(albumId) {
        this.currentView = 'images';
        this.loadAlbumImages(albumId).then(() => {
            this.albumsView.hidden = true;
            this.imagesView.hidden = false;
            this.renderImages();
            this.updateImagesHeader();
        });
    }

    updateImagesHeader() {
        const header = document.getElementById('images-view-header');
        if (header && this.currentAlbum) {
            header.querySelector('h1').textContent = this.currentAlbum.title;
            header.querySelector('p').textContent = `${this.currentImages.length} images in this album`;
        }
    }

    // ========================================
    // Albums Rendering
    // ========================================

    renderAlbums() {
        if (!this.albumsList) return;

        if (this.albums.length === 0) {
            this.albumsList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <p>No albums yet</p>
                    <button type="button" class="btn btn-primary" onclick="galleryAdmin.showAlbumEditor()">Create First Album</button>
                </div>
            `;
            return;
        }

        this.albumsList.innerHTML = this.albums.map(album => `
            <div class="album-card" data-album-id="${album.id}">
                <div class="album-card-image" style="background-image: url('${escapeHTML(album.cover_image) || 'images/placeholder.jpg'}');" onclick="galleryAdmin.showImagesView(${album.id})" role="button" tabindex="0">
                    ${!album.is_active ? '<span class="album-status-badge">Hidden</span>' : ''}
                </div>
                <div class="album-card-content">
                    <div class="album-card-header">
                        <div>
                            <span class="album-label">${escapeHTML(album.label)}</span>
                            <h3 class="album-title">${escapeHTML(album.title)}</h3>
                        </div>
                        <div class="album-actions">
                            <button type="button" class="btn-icon" onclick="galleryAdmin.showImagesView(${album.id})" title="View images">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                            <button type="button" class="btn-icon" onclick="galleryAdmin.editAlbum(${album.id})" title="Edit album">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button type="button" class="btn-icon btn-danger" onclick="galleryAdmin.deleteAlbum(${album.id})" title="Delete album">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="album-card-meta">
                        <span class="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            ${album.imageCount || 0} images
                        </span>
                        <span class="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            ${escapeHTML(album.slug)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // Images Rendering
    // ========================================

    renderImages() {
        if (!this.imagesList) return;

        if (this.currentImages.length === 0) {
            this.imagesList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <p>No images in this album</p>
                    <button type="button" class="btn btn-primary" onclick="galleryAdmin.showImageUploader()">Add Images</button>
                </div>
            `;
            return;
        }

        this.imagesList.innerHTML = this.currentImages.map(image => `
            <div class="image-card-admin" data-image-id="${image.id}">
                <div class="image-card-image" style="background-image: url('${escapeHTML(image.file_path || '')}');">
                    ${this.currentAlbum && this.currentAlbum.cover_image === image.file_path ?
                        '<span class="cover-badge">Cover</span>' : ''}
                </div>
                <div class="image-card-content">
                    <div class="image-card-header">
                        <div>
                            <h4 class="image-title">${escapeHTML(image.title || image.filename || '')}</h4>
                            ${image.caption ? `<p class="image-caption">${escapeHTML(image.caption)}</p>` : ''}
                        </div>
                        <div class="image-actions">
                            <button type="button" class="btn-icon" onclick="galleryAdmin.editImage(${image.id})" title="Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button type="button" class="btn-icon" onclick="galleryAdmin.showImageActions(${image.id})" title="More">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="1"></circle>
                                    <circle cx="12" cy="5" r="1"></circle>
                                    <circle cx="12" cy="19" r="1"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="image-card-meta">
                        ${image.category ? `<span class="meta-tag">${escapeHTML(image.category)}</span>` : ''}
                        ${image.photographer ? `<span class="meta-tag">${escapeHTML(image.photographer)}</span>` : ''}
                        ${image.location ? `<span class="meta-tag">${escapeHTML(image.location)}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // Album Operations
    // ========================================

    showAlbumEditor(albumId = null) {
        this.editingAlbum = albumId;
        const modal = document.getElementById('album-editor-modal');
        const form = document.getElementById('album-form');

        if (albumId) {
            const album = this.albums.find(a => a.id === albumId);
            document.getElementById('album-editor-title').textContent = 'Edit Album';
            document.getElementById('album-name').value = album.name || '';
            document.getElementById('album-label').value = album.label || '';
            document.getElementById('album-title').value = album.title || '';
            document.getElementById('album-slug').value = album.slug || '';
            document.getElementById('album-directory').value = album.directory_name || '';
            document.getElementById('album-description').value = album.description || '';
            document.getElementById('album-sort-order').value = album.sort_order || 0;
            document.getElementById('album-is-active').checked = album.is_active;
        } else {
            document.getElementById('album-editor-title').textContent = 'Create New Album';
            form.reset();
            document.getElementById('album-is-active').checked = true;
        }

        modal.hidden = false;
    }

    hideAlbumEditor() {
        document.getElementById('album-editor-modal').hidden = true;
        this.editingAlbum = null;
    }

    async saveAlbum(e) {
        e.preventDefault();

        const albumData = {
            name: document.getElementById('album-name').value,
            label: document.getElementById('album-label').value,
            title: document.getElementById('album-title').value,
            slug: document.getElementById('album-slug').value,
            directory_name: document.getElementById('album-directory').value,
            description: document.getElementById('album-description').value,
            sort_order: parseInt(document.getElementById('album-sort-order').value) || 0,
            is_active: document.getElementById('album-is-active').checked
        };

        try {
            if (this.editingAlbum) {
                await galleryAPI.updateAlbum(this.editingAlbum, albumData);
                this.showSuccess('Album updated successfully');
            } else {
                await galleryAPI.createAlbum(albumData);
                this.showSuccess('Album created successfully');
            }

            this.hideAlbumEditor();
            await this.loadAlbums();
            this.renderAlbums();
        } catch (error) {
            console.error('Error saving album:', error);
            this.showError('Failed to save album: ' + error.message);
        }
    }

    editAlbum(albumId) {
        this.showAlbumEditor(albumId);
    }

    async deleteAlbum(albumId) {
        this.deleteAlbumId = albumId;
        const album = this.albums.find(a => a.id === albumId);
        const imageCount = album.imageCount || 0;

        const modal = document.getElementById('delete-album-modal');
        const message = document.getElementById('delete-album-message');

        message.innerHTML = `
            <p><strong>Are you sure you want to delete "${album.title}"?</strong></p>
            ${imageCount > 0 ? `
                <div class="warning-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <div>
                        <strong>Warning:</strong> This album contains ${imageCount} image${imageCount > 1 ? 's' : ''}.
                        <br>All images in this album will be permanently deleted.
                    </div>
                </div>
            ` : ''}
            <p>This action cannot be undone.</p>
        `;

        modal.hidden = false;
    }

    hideDeleteAlbumModal() {
        document.getElementById('delete-album-modal').hidden = true;
        this.deleteAlbumId = null;
    }

    async confirmDeleteAlbum() {
        if (!this.deleteAlbumId) return;

        try {
            await galleryAPI.deleteAlbum(this.deleteAlbumId);
            this.showSuccess('Album deleted successfully');
            this.hideDeleteAlbumModal();
            await this.loadAlbums();
            this.renderAlbums();
        } catch (error) {
            console.error('Error deleting album:', error);
            this.showError('Failed to delete album: ' + error.message);
        }
    }

    // ========================================
    // Image Operations
    // ========================================

    showImageUploader() {
        this.editingImage = null;
        const modal = document.getElementById('image-editor-modal');
        const form = document.getElementById('image-form');

        document.getElementById('image-editor-title').textContent = 'Add Image';
        form.reset();
        document.getElementById('image-preview').innerHTML = '<span class="image-preview-placeholder">Image preview</span>';

        modal.hidden = false;
    }

    showBulkUploader() {
        // Create bulk upload modal if it doesn't exist
        let modal = document.getElementById('bulk-upload-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bulk-upload-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-backdrop"></div>
                <div class="modal-content bulk-upload-content">
                    <button type="button" class="modal-close" aria-label="Close">&times;</button>
                    <h2 class="title">Bulk Upload Images</h2>
                    <form id="bulk-upload-form">
                        <div class="form-section">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Select Images</label>
                                    <div class="bulk-upload-dropzone" id="bulk-dropzone">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        <p>Drag & drop images here, or click to select</p>
                                        <input type="file" id="bulk-files-input" multiple accept="image/jpeg,image/png,image/gif,image/webp" class="bulk-file-input">
                                    </div>
                                </div>
                            </div>
                            <div id="bulk-preview-container" class="bulk-preview-container" hidden>
                                <h3>Selected Images (<span id="bulk-count">0</span>)</h3>
                                <div id="bulk-preview-grid" class="bulk-preview-grid"></div>
                            </div>
                        </div>
                        <div class="form-section">
                            <h3>Default Metadata (Optional)</h3>
                            <p class="form-help">These values will be applied to all uploaded images. You can edit individual images after upload.</p>
                            <div class="form-row two-col">
                                <div class="form-group">
                                    <label for="bulk-category">Category</label>
                                    <input type="text" id="bulk-category" placeholder="e.g., Batwa, Nepal">
                                </div>
                                <div class="form-group">
                                    <label for="bulk-photographer">Photographer</label>
                                    <input type="text" id="bulk-photographer" placeholder="Photographer name">
                                </div>
                            </div>
                            <div class="form-row two-col">
                                <div class="form-group">
                                    <label for="bulk-location">Location</label>
                                    <input type="text" id="bulk-location" placeholder="e.g., Uganda, Nepal">
                                </div>
                                <div class="form-group">
                                    <label for="bulk-date">Photo Date</label>
                                    <input type="date" id="bulk-date">
                                </div>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="cancel-bulk-upload" class="btn btn-outline">Cancel</button>
                            <button type="submit" id="submit-bulk-upload" class="btn btn-primary" disabled>Upload Images</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            // Setup event listeners for bulk upload modal
            this.setupBulkUploadListeners(modal);
        }

        // Reset the form
        document.getElementById('bulk-upload-form').reset();
        document.getElementById('bulk-preview-container').hidden = true;
        document.getElementById('bulk-preview-grid').innerHTML = '';
        document.getElementById('submit-bulk-upload').disabled = true;
        this.bulkFiles = [];

        modal.hidden = false;
    }

    setupBulkUploadListeners(modal) {
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-bulk-upload');
        const backdrop = modal.querySelector('.modal-backdrop');
        const fileInput = document.getElementById('bulk-files-input');
        const dropzone = document.getElementById('bulk-dropzone');
        const form = document.getElementById('bulk-upload-form');

        // Close handlers
        const closeBulkModal = () => {
            modal.hidden = true;
            this.bulkFiles = [];
        };

        closeBtn.addEventListener('click', closeBulkModal);
        cancelBtn.addEventListener('click', closeBulkModal);
        backdrop.addEventListener('click', closeBulkModal);

        // File selection
        fileInput.addEventListener('change', (e) => this.handleBulkFileSelect(e.target.files));

        // Drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            this.handleBulkFileSelect(e.dataTransfer.files);
        });
        dropzone.addEventListener('click', () => fileInput.click());

        // Form submit
        form.addEventListener('submit', (e) => this.submitBulkUpload(e));
    }

    handleBulkFileSelect(files) {
        this.bulkFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

        const previewContainer = document.getElementById('bulk-preview-container');
        const previewGrid = document.getElementById('bulk-preview-grid');
        const countSpan = document.getElementById('bulk-count');
        const submitBtn = document.getElementById('submit-bulk-upload');

        if (this.bulkFiles.length === 0) {
            previewContainer.hidden = true;
            submitBtn.disabled = true;
            return;
        }

        countSpan.textContent = this.bulkFiles.length;
        previewContainer.hidden = false;
        submitBtn.disabled = false;

        previewGrid.innerHTML = '';
        this.bulkFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = document.createElement('div');
                item.className = 'bulk-preview-item';
                item.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <span class="bulk-preview-name">${file.name}</span>
                    <button type="button" class="bulk-preview-remove" data-index="${index}" title="Remove">&times;</button>
                `;
                previewGrid.appendChild(item);

                // Add remove handler
                item.querySelector('.bulk-preview-remove').addEventListener('click', () => {
                    this.bulkFiles.splice(index, 1);
                    this.handleBulkFileSelect(this.bulkFiles);
                });
            };
            reader.readAsDataURL(file);
        });
    }

    async submitBulkUpload(e) {
        e.preventDefault();

        if (!this.bulkFiles || this.bulkFiles.length === 0) {
            this.showError('Please select at least one image');
            return;
        }

        const submitBtn = document.getElementById('submit-bulk-upload');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';

        const defaultMetadata = {
            category: document.getElementById('bulk-category').value,
            photographer: document.getElementById('bulk-photographer').value,
            location: document.getElementById('bulk-location').value,
            photo_date: document.getElementById('bulk-date').value || null
        };

        try {
            let successCount = 0;

            for (const file of this.bulkFiles) {
                // Create file path (in production, upload to storage first)
                const filePath = `images/gallery/${this.currentAlbum.directory_name}/${file.name}`;

                const imageData = {
                    album_id: this.currentAlbum.id,
                    filename: file.name,
                    file_path: filePath,
                    title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                    alt_text: 'Gallery image',
                    ...defaultMetadata,
                    sort_order: this.currentImages.length + successCount
                };

                await galleryAPI.createImage(imageData);
                successCount++;
            }

            this.showSuccess(`Successfully added ${successCount} image(s)`);
            document.getElementById('bulk-upload-modal').hidden = true;
            this.bulkFiles = [];
            await this.loadAlbumImages(this.currentAlbum.id);
            this.renderImages();
            this.updateImagesHeader();

        } catch (error) {
            console.error('Error uploading images:', error);
            this.showError('Failed to upload images: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload Images';
        }
    }

    showImageEditor(imageId) {
        this.editingImage = imageId;
        const image = this.currentImages.find(img => img.id === imageId);
        const modal = document.getElementById('image-editor-modal');

        document.getElementById('image-editor-title').textContent = 'Edit Image';
        document.getElementById('image-title').value = image.title || '';
        document.getElementById('image-alt').value = image.alt_text || '';
        document.getElementById('image-caption').value = image.caption || '';
        document.getElementById('image-category').value = image.category || '';
        document.getElementById('image-photographer').value = image.photographer || '';
        document.getElementById('image-location').value = image.location || '';
        document.getElementById('image-tags').value = image.tags || '';

        if (image.photo_date) {
            document.getElementById('image-date').value = image.photo_date;
        }

        // Show preview
        const preview = document.getElementById('image-preview');
        preview.innerHTML = `<img src="${image.file_path}" alt="Preview">`;

        modal.hidden = false;
    }

    hideImageEditor() {
        document.getElementById('image-editor-modal').hidden = true;
        this.editingImage = null;
    }

    handleImageFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Update file name display
        document.getElementById('image-file-name').textContent = file.name;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-preview').innerHTML =
                `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }

    async saveImage(e) {
        e.preventDefault();

        const file = document.getElementById('image-file').files[0];
        let filePath = '';
        let filename = '';

        if (file) {
            // Generate file path - in production, upload to storage first
            // For now, we assume manual file placement in the images/gallery folder
            filename = file.name;
            filePath = `images/gallery/${this.currentAlbum.directory_name}/${filename}`;

            // Note: For full storage integration, you would upload to Supabase Storage here:
            // const { data, error } = await supabase.storage.from('gallery').upload(filePath, file);
            // if (error) throw error;
            // filePath = data.path;
        } else if (this.editingImage) {
            const existing = this.currentImages.find(img => img.id === this.editingImage);
            filePath = existing.file_path;
            filename = existing.filename;
        }

        const imageData = {
            album_id: this.currentAlbum.id,
            filename: file ? file.name : this.editingImage ? this.currentImages.find(img => img.id === this.editingImage).filename : '',
            file_path: filePath,
            title: document.getElementById('image-title').value,
            alt_text: document.getElementById('image-alt').value || 'Gallery image',
            caption: document.getElementById('image-caption').value,
            category: document.getElementById('image-category').value,
            photographer: document.getElementById('image-photographer').value,
            photo_date: document.getElementById('image-date').value || null,
            location: document.getElementById('image-location').value,
            tags: document.getElementById('image-tags').value,
            sort_order: this.currentImages.length
        };

        try {
            if (this.editingImage) {
                await galleryAPI.updateImage(this.editingImage, imageData);
                this.showSuccess('Image updated successfully');
            } else {
                await galleryAPI.createImage(imageData);
                this.showSuccess('Image added successfully');
            }

            this.hideImageEditor();
            await this.loadAlbumImages(this.currentAlbum.id);
            this.renderImages();
        } catch (error) {
            console.error('Error saving image:', error);
            this.showError('Failed to save image: ' + error.message);
        }
    }

    editImage(imageId) {
        this.showImageEditor(imageId);
    }

    showImageActions(imageId) {
        const image = this.currentImages.find(img => img.id === imageId);

        // Show context menu with move/duplicate options
        const modal = document.getElementById('image-actions-modal');
        document.getElementById('image-actions-title').textContent = image.title || image.filename;

        // Populate album list for move/duplicate
        const albumSelect = document.getElementById('target-album');
        albumSelect.innerHTML = this.albums
            .filter(a => a.id !== this.currentAlbum.id)
            .map(album => `<option value="${album.id}">${album.title}</option>`)
            .join('');

        document.getElementById('move-image-btn').onclick = () => this.moveImage(imageId);
        document.getElementById('duplicate-image-btn').onclick = () => this.duplicateImage(imageId);
        document.getElementById('set-cover-btn').onclick = () => this.setCoverImage(imageId);
        document.getElementById('delete-image-btn').onclick = () => this.deleteImage(imageId);

        modal.hidden = false;
    }

    async moveImage(imageId) {
        const targetAlbumId = parseInt(document.getElementById('target-album').value);

        try {
            await galleryAPI.moveImage(imageId, targetAlbumId);
            this.showSuccess('Image moved successfully');
            document.getElementById('image-actions-modal').hidden = true;
            await this.loadAlbumImages(this.currentAlbum.id);
            this.renderImages();
        } catch (error) {
            console.error('Error moving image:', error);
            this.showError('Failed to move image');
        }
    }

    async duplicateImage(imageId) {
        const targetAlbumId = parseInt(document.getElementById('target-album').value);

        try {
            await galleryAPI.duplicateImage(imageId, targetAlbumId);
            this.showSuccess('Image duplicated successfully');
            document.getElementById('image-actions-modal').hidden = true;
        } catch (error) {
            console.error('Error duplicating image:', error);
            this.showError('Failed to duplicate image');
        }
    }

    async setCoverImage(imageId) {
        const image = this.currentImages.find(img => img.id === imageId);

        try {
            await galleryAPI.updateAlbum(this.currentAlbum.id, {
                cover_image: image.file_path
            });

            // Update the cached album data with the new cover image
            this.currentAlbum.cover_image = image.file_path;
            const albumIndex = this.albums.findIndex(a => a.id === this.currentAlbum.id);
            if (albumIndex !== -1) {
                this.albums[albumIndex].cover_image = image.file_path;
            }

            this.showSuccess('Cover image updated');
            document.getElementById('image-actions-modal').hidden = true;
            this.renderImages();
        } catch (error) {
            console.error('Error setting cover image:', error);
            this.showError('Failed to set cover image');
        }
    }

    async deleteImage(imageId) {
        this.deleteImageId = imageId;
        const image = this.currentImages.find(img => img.id === imageId);

        document.getElementById('delete-image-title').textContent =
            `Are you sure you want to delete "${image.title || image.filename}"?`;

        document.getElementById('image-actions-modal').hidden = true;
        document.getElementById('delete-image-modal').hidden = false;
    }

    hideDeleteImageModal() {
        document.getElementById('delete-image-modal').hidden = true;
        this.deleteImageId = null;
    }

    async confirmDeleteImage() {
        if (!this.deleteImageId) return;

        try {
            await galleryAPI.deleteImage(this.deleteImageId);
            this.showSuccess('Image deleted successfully');
            this.hideDeleteImageModal();
            await this.loadAlbumImages(this.currentAlbum.id);
            this.renderImages();
        } catch (error) {
            console.error('Error deleting image:', error);
            this.showError('Failed to delete image');
        }
    }

    hideImageActionsModal() {
        document.getElementById('image-actions-modal').hidden = true;
    }

    // ========================================
    // Bulk Selection
    // ========================================

    toggleBulkSelectMode(enabled) {
        const bulkActionsMenu = document.getElementById('bulk-actions-menu');
        bulkActionsMenu.hidden = !enabled;

        // Toggle checkboxes on image cards
        const imageCards = document.querySelectorAll('.image-card-admin');
        imageCards.forEach(card => {
            let checkbox = card.querySelector('.bulk-select-checkbox');
            if (enabled) {
                if (!checkbox) {
                    checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'bulk-select-checkbox';
                    checkbox.dataset.imageId = card.dataset.imageId;
                    card.appendChild(checkbox);
                }
                checkbox.style.display = 'block';
            } else if (checkbox) {
                checkbox.style.display = 'none';
                checkbox.checked = false;
            }
        });
    }

    getSelectedImageIds() {
        const checkboxes = document.querySelectorAll('.bulk-select-checkbox:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.dataset.imageId));
    }

    async bulkMoveImages() {
        const selectedIds = this.getSelectedImageIds();
        if (selectedIds.length === 0) {
            this.showError('Please select at least one image');
            return;
        }

        const targetAlbumId = prompt('Enter target album ID:');
        if (!targetAlbumId) return;

        try {
            for (const imageId of selectedIds) {
                await galleryAPI.moveImage(imageId, parseInt(targetAlbumId));
            }
            this.showSuccess(`Moved ${selectedIds.length} image(s) successfully`);
            await this.loadAlbumImages(this.currentAlbum.id);
            this.renderImages();
        } catch (error) {
            console.error('Error moving images:', error);
            this.showError('Failed to move images');
        }
    }

    async bulkDeleteImages() {
        const selectedIds = this.getSelectedImageIds();
        if (selectedIds.length === 0) {
            this.showError('Please select at least one image');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedIds.length} image(s)?`)) {
            return;
        }

        try {
            for (const imageId of selectedIds) {
                await galleryAPI.deleteImage(imageId);
            }
            this.showSuccess(`Deleted ${selectedIds.length} image(s) successfully`);
            await this.loadAlbumImages(this.currentAlbum.id);
            this.renderImages();
        } catch (error) {
            console.error('Error deleting images:', error);
            this.showError('Failed to delete images');
        }
    }

    // ========================================
    // Utilities
    // ========================================

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${type === 'success'
                        ? '<path d="M20 6L9 17l-5-5"></path>'
                        : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'}
                </svg>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        document.body.appendChild(toast);

        // Add close handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('toast-hiding');
            setTimeout(() => toast.remove(), 300);
        });

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });

        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('toast-hiding');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    filterImages(searchTerm) {
        if (!searchTerm || !searchTerm.trim()) {
            // No search term - show all images
            this.renderImages();
            return;
        }

        const term = searchTerm.toLowerCase().trim();
        const filteredImages = this.currentImages.filter(image => {
            const title = (image.title || '').toLowerCase();
            const caption = (image.caption || '').toLowerCase();
            const filename = (image.filename || '').toLowerCase();
            const category = (image.category || '').toLowerCase();
            const photographer = (image.photographer || '').toLowerCase();
            const location = (image.location || '').toLowerCase();
            const tags = (image.tags || '').toLowerCase();

            return title.includes(term) ||
                   caption.includes(term) ||
                   filename.includes(term) ||
                   category.includes(term) ||
                   photographer.includes(term) ||
                   location.includes(term) ||
                   tags.includes(term);
        });

        this.renderFilteredImages(filteredImages);
    }

    filterByCategory(category) {
        if (!category || category === 'all') {
            // No filter - show all images
            this.renderImages();
            return;
        }

        const filteredImages = this.currentImages.filter(image =>
            image.category && image.category.toLowerCase() === category.toLowerCase()
        );

        this.renderFilteredImages(filteredImages);
    }

    renderFilteredImages(images) {
        if (!this.imagesList) return;

        if (images.length === 0) {
            this.imagesList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                    <p>No images match your search</p>
                    <button type="button" class="btn btn-outline" onclick="document.getElementById('search-images').value=''; document.getElementById('filter-category').value='all'; galleryAdmin.renderImages();">Clear Filters</button>
                </div>
            `;
            return;
        }

        this.imagesList.innerHTML = images.map(image => `
            <div class="image-card-admin" data-image-id="${image.id}">
                <div class="image-card-image" style="background-image: url('${escapeHTML(image.file_path || '')}');">
                    ${this.currentAlbum && this.currentAlbum.cover_image === image.file_path ?
                        '<span class="cover-badge">Cover</span>' : ''}
                </div>
                <div class="image-card-content">
                    <div class="image-card-header">
                        <div>
                            <h4 class="image-title">${escapeHTML(image.title || image.filename || '')}</h4>
                            ${image.caption ? `<p class="image-caption">${escapeHTML(image.caption)}</p>` : ''}
                        </div>
                        <div class="image-actions">
                            <button type="button" class="btn-icon" onclick="galleryAdmin.editImage(${image.id})" title="Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button type="button" class="btn-icon" onclick="galleryAdmin.showImageActions(${image.id})" title="More">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="1"></circle>
                                    <circle cx="12" cy="5" r="1"></circle>
                                    <circle cx="12" cy="19" r="1"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="image-card-meta">
                        ${image.category ? `<span class="meta-tag">${escapeHTML(image.category)}</span>` : ''}
                        ${image.photographer ? `<span class="meta-tag">${escapeHTML(image.photographer)}</span>` : ''}
                        ${image.location ? `<span class="meta-tag">${escapeHTML(image.location)}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Initialize gallery admin when DOM is ready
let galleryAdmin;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('gallery-tab')) {
        galleryAdmin = new GalleryAdmin();
    }
});

// Export for use in HTML onclick handlers
window.galleryAdmin = galleryAdmin;
