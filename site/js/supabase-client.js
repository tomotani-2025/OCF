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
    async getImages(options = {}) {
        return supabase.query('gallery_images', {
            select: '*',
            order: 'sort_order.asc',
            ...options
        });
    },

    async getByCategory(category) {
        return supabase.query('gallery_images', {
            select: '*',
            eq: { category },
            order: 'sort_order.asc'
        });
    },

    async getCategories() {
        return supabase.query('gallery_categories', {
            select: '*',
            order: 'sort_order.asc'
        });
    },

    async createImage(image) {
        return supabase.insert('gallery_images', image);
    },

    async updateImage(id, data) {
        return supabase.update('gallery_images', data, { id });
    },

    async deleteImage(id) {
        return supabase.delete('gallery_images', { id });
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

// Export for use
window.supabase = supabase;
window.postsAPI = postsAPI;
window.galleryAPI = galleryAPI;
window.progressAPI = progressAPI;
