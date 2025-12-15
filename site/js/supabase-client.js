/**
 * Supabase Client for Omotani Caring Foundation
 *
 * This provides the database connection for posts, gallery, and progress data.
 * Data is fetched dynamically - no rebuilds needed when content changes!
 */

const SUPABASE_URL = 'https://wafdatyvcgimpsetelyb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZmRhdHl2Y2dpbXBzZXRlbHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY2NjcsImV4cCI6MjA4MTA3MjY2N30.khU-SsaThjovP0H29DWHuxBraiYS0YWY2c8rTEEir4o';

// Simple Supabase REST API client (no SDK needed)
const supabase = {
    async query(table, options = {}) {
        let url = `${SUPABASE_URL}/rest/v1/${table}`;
        const params = new URLSearchParams();

        // Handle select
        if (options.select) {
            params.set('select', options.select);
        }

        // Handle filters
        if (options.eq) {
            Object.entries(options.eq).forEach(([col, val]) => {
                params.set(col, `eq.${val}`);
            });
        }

        // Handle ordering
        if (options.order) {
            params.set('order', options.order);
        }

        // Handle limit
        if (options.limit) {
            params.set('limit', options.limit);
        }

        // Handle offset for pagination
        if (options.offset) {
            params.set('offset', options.offset);
        }

        const queryString = params.toString();
        if (queryString) {
            url += '?' + queryString;
        }

        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase query failed: ${response.statusText}`);
        }

        return response.json();
    },

    async insert(table, data) {
        const url = `${SUPABASE_URL}/rest/v1/${table}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Insert failed');
        }

        return response.json();
    },

    async update(table, data, filters) {
        let url = `${SUPABASE_URL}/rest/v1/${table}`;
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([col, val]) => {
            params.set(col, `eq.${val}`);
        });

        url += '?' + params.toString();

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Update failed');
        }

        return response.json();
    },

    async delete(table, filters) {
        let url = `${SUPABASE_URL}/rest/v1/${table}`;
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([col, val]) => {
            params.set(col, `eq.${val}`);
        });

        url += '?' + params.toString();

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Delete failed');
        }

        return true;
    },

    async count(table, filters = {}) {
        let url = `${SUPABASE_URL}/rest/v1/${table}?select=count`;

        Object.entries(filters).forEach(([col, val]) => {
            url += `&${col}=eq.${val}`;
        });

        const response = await fetch(url, {
            method: 'HEAD',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'count=exact'
            }
        });

        const count = response.headers.get('content-range');
        if (count) {
            const match = count.match(/\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }
        return 0;
    }
};

// Posts API
const postsAPI = {
    async getAll(options = {}) {
        return supabase.query('posts', {
            select: '*',
            order: 'date.desc',
            ...options
        });
    },

    async getById(id) {
        const results = await supabase.query('posts', {
            select: '*',
            eq: { id }
        });
        return results[0] || null;
    },

    async getByCategory(category, options = {}) {
        return supabase.query('posts', {
            select: '*',
            eq: { category },
            order: 'date.desc',
            ...options
        });
    },

    async getByYear(year, options = {}) {
        return supabase.query('posts', {
            select: '*',
            eq: { year },
            order: 'date.desc',
            ...options
        });
    },

    async create(post) {
        return supabase.insert('posts', post);
    },

    async update(id, data) {
        return supabase.update('posts', data, { id });
    },

    async delete(id) {
        return supabase.delete('posts', { id });
    },

    async count(filters = {}) {
        return supabase.count('posts', filters);
    }
};

// Gallery API
const galleryAPI = {
    // Album operations
    async getAllAlbums(options = {}) {
        return supabase.query('albums', {
            select: '*',
            order: 'sort_order.asc',
            ...options
        });
    },

    async getActiveAlbums() {
        return supabase.query('albums', {
            select: '*',
            eq: { is_active: true },
            order: 'sort_order.asc'
        });
    },

    async getAlbumById(id) {
        const results = await supabase.query('albums', {
            select: '*',
            eq: { id }
        });
        return results[0] || null;
    },

    async getAlbumBySlug(slug) {
        const results = await supabase.query('albums', {
            select: '*',
            eq: { slug }
        });
        return results[0] || null;
    },

    async createAlbum(album) {
        return supabase.insert('albums', album);
    },

    async updateAlbum(id, data) {
        return supabase.update('albums', data, { id });
    },

    async deleteAlbum(id) {
        return supabase.delete('albums', { id });
    },

    async getAlbumImageCount(albumId) {
        return supabase.count('album_images', { album_id: albumId });
    },

    // Image operations
    async getImagesByAlbum(albumId, options = {}) {
        return supabase.query('album_images', {
            select: '*',
            eq: { album_id: albumId },
            order: 'sort_order.asc',
            ...options
        });
    },

    async getImageById(id) {
        const results = await supabase.query('album_images', {
            select: '*',
            eq: { id }
        });
        return results[0] || null;
    },

    async searchImages(searchParams = {}) {
        let options = {
            select: '*',
            order: 'sort_order.asc'
        };

        // Add filters based on search params
        if (searchParams.category) {
            options.eq = { ...options.eq, category: searchParams.category };
        }
        if (searchParams.photographer) {
            options.eq = { ...options.eq, photographer: searchParams.photographer };
        }
        if (searchParams.location) {
            options.eq = { ...options.eq, location: searchParams.location };
        }

        return supabase.query('album_images', options);
    },

    async createImage(image) {
        return supabase.insert('album_images', image);
    },

    async createImages(images) {
        // Bulk insert multiple images
        return supabase.insert('album_images', images);
    },

    async updateImage(id, data) {
        return supabase.update('album_images', data, { id });
    },

    async deleteImage(id) {
        return supabase.delete('album_images', { id });
    },

    async moveImage(imageId, newAlbumId) {
        return supabase.update('album_images', { album_id: newAlbumId }, { id: imageId });
    },

    async duplicateImage(imageId, targetAlbumId) {
        // Get the source image
        const sourceImage = await this.getImageById(imageId);
        if (!sourceImage) {
            throw new Error('Source image not found');
        }

        // Create duplicate with new album_id
        const duplicate = { ...sourceImage };
        delete duplicate.id; // Remove id so Supabase generates new one
        delete duplicate.created_at;
        delete duplicate.updated_at;
        duplicate.album_id = targetAlbumId;

        return this.createImage(duplicate);
    },

    async reorderImages(albumId, imageOrders) {
        // Update sort_order for multiple images
        // imageOrders is array of {id, sort_order}
        const promises = imageOrders.map(({ id, sort_order }) =>
            this.updateImage(id, { sort_order })
        );
        return Promise.all(promises);
    }
};

// Progress API
const progressAPI = {
    async getGoals() {
        return supabase.query('progress_goals', {
            select: '*',
            order: 'sort_order.asc'
        });
    },

    async createGoal(goal) {
        return supabase.insert('progress_goals', goal);
    },

    async updateGoal(id, data) {
        return supabase.update('progress_goals', data, { id });
    },

    async deleteGoal(id) {
        return supabase.delete('progress_goals', { id });
    }
};

// About Us API (trustees and advisors)
const aboutAPI = {
    async getContent() {
        const results = await supabase.query('about_content', {
            select: '*',
            order: 'sort_order.asc'
        });
        return results;
    },

    async getByType(type) {
        return supabase.query('about_content', {
            select: '*',
            eq: { type },
            order: 'sort_order.asc'
        });
    },

    async upsert(item) {
        // Check if item exists
        const existing = await supabase.query('about_content', {
            select: 'id',
            eq: { id: item.id }
        });

        if (existing && existing.length > 0) {
            return supabase.update('about_content', item, { id: item.id });
        } else {
            return supabase.insert('about_content', item);
        }
    },

    async update(id, data) {
        return supabase.update('about_content', data, { id });
    },

    async delete(id) {
        return supabase.delete('about_content', { id });
    }
};

// Mission API (mission statements and goal cards on Our Mission page)
const missionAPI = {
    async getStatements() {
        return supabase.query('mission_statements', {
            select: '*',
            order: 'sort_order.asc'
        });
    },

    async upsertStatement(item) {
        const existing = await supabase.query('mission_statements', {
            select: 'id',
            eq: { id: item.id }
        });

        if (existing && existing.length > 0) {
            return supabase.update('mission_statements', item, { id: item.id });
        } else {
            return supabase.insert('mission_statements', item);
        }
    },

    async deleteStatement(id) {
        return supabase.delete('mission_statements', { id });
    },

    async getGoalCards() {
        return supabase.query('mission_goal_cards', {
            select: '*',
            order: 'sort_order.asc'
        });
    },

    async upsertGoalCard(item) {
        const existing = await supabase.query('mission_goal_cards', {
            select: 'id',
            eq: { id: item.id }
        });

        if (existing && existing.length > 0) {
            return supabase.update('mission_goal_cards', item, { id: item.id });
        } else {
            return supabase.insert('mission_goal_cards', item);
        }
    },

    async deleteGoalCard(id) {
        return supabase.delete('mission_goal_cards', { id });
    },

    async getSettings() {
        const results = await supabase.query('mission_settings', {
            select: '*',
            limit: 1
        });
        return results[0] || null;
    },

    async updateSettings(data) {
        const existing = await this.getSettings();
        if (existing) {
            return supabase.update('mission_settings', data, { id: existing.id });
        } else {
            return supabase.insert('mission_settings', { id: 'main', ...data });
        }
    }
};

// Goal Pages API (individual goal page content)
const goalPagesAPI = {
    async getAll() {
        return supabase.query('goal_pages', {
            select: '*',
            order: 'sort_order.asc'
        });
    },

    async getById(id) {
        const results = await supabase.query('goal_pages', {
            select: '*',
            eq: { id }
        });
        return results[0] || null;
    },

    async upsert(item) {
        const existing = await supabase.query('goal_pages', {
            select: 'id',
            eq: { id: item.id }
        });

        if (existing && existing.length > 0) {
            return supabase.update('goal_pages', item, { id: item.id });
        } else {
            return supabase.insert('goal_pages', item);
        }
    },

    async update(id, data) {
        return supabase.update('goal_pages', data, { id });
    },

    async delete(id) {
        return supabase.delete('goal_pages', { id });
    }
};

// Export for use
window.supabase = supabase;
window.postsAPI = postsAPI;
window.galleryAPI = galleryAPI;
window.progressAPI = progressAPI;
window.aboutAPI = aboutAPI;
window.missionAPI = missionAPI;
window.goalPagesAPI = goalPagesAPI;
