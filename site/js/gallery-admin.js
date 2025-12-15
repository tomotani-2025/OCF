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
                <div class="album-card-image" style="background-image: url('${album.cover_image || 'images/placeholder.jpg'}');" onclick="galleryAdmin.showImagesView(${album.id})" role="button" tabindex="0">
                    ${!album.is_active ? '<span class="album-status-badge">Hidden</span>' : ''}
                </div>
                <div class="album-card-content">
                    <div class="album-card-header">
                        <div>
                            <span class="album-label">${album.label}</span>
                            <h3 class="album-title">${album.title}</h3>
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
                            ${album.slug}
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
                <div class="image-card-image" style="background-image: url('${image.file_path}');">
                    ${this.currentAlbum && this.currentAlbum.cover_image === image.file_path ?
                        '<span class="cover-badge">Cover</span>' : ''}
                </div>
                <div class="image-card-content">
                    <div class="image-card-header">
                        <div>
                            <h4 class="image-title">${image.title || image.filename}</h4>
                            ${image.caption ? `<p class="image-caption">${image.caption}</p>` : ''}
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
                        ${image.category ? `<span class="meta-tag">${image.category}</span>` : ''}
                        ${image.photographer ? `<span class="meta-tag">${image.photographer}</span>` : ''}
                        ${image.location ? `<span class="meta-tag">${image.location}</span>` : ''}
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
        // TODO: Implement bulk upload modal with file upload integration
        alert('Bulk upload functionality is coming soon! This feature will allow you to upload multiple images at once with batch metadata input.');
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

        // TODO: Handle file upload to storage
        const file = document.getElementById('image-file').files[0];
        let filePath = '';

        if (file) {
            // For now, just use a placeholder path
            // In production, upload to Supabase Storage or your preferred solution
            filePath = `images/gallery/${this.currentAlbum.directory_name}/${file.name}`;
        } else if (this.editingImage) {
            const existing = this.currentImages.find(img => img.id === this.editingImage);
            filePath = existing.file_path;
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
            this.showSuccess('Cover image updated');
            document.getElementById('image-actions-modal').hidden = true;
            await this.loadAlbumImages(this.currentAlbum.id);
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
        // TODO: Implement toast notification
        alert(message);
    }

    showError(message) {
        // TODO: Implement toast notification
        alert('Error: ' + message);
    }

    filterImages(searchTerm) {
        // TODO: Implement image search
    }

    filterByCategory(category) {
        // TODO: Implement category filter
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
