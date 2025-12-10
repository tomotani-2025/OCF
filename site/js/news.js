/**
 * News CMS System for Omotani Caring Foundation
 *
 * HOW TO ADD A NEW NEWS POST:
 * 1. Open site/data/news-posts.json
 * 2. Add a new entry at the TOP of the "posts" array
 * 3. Fill in all required fields (see example below)
 *
 * Example new post:
 * {
 *   "id": "unique-post-id-2025",
 *   "title": "Your Post Title Here",
 *   "date": "2025-03-15",
 *   "year": 2025,
 *   "image": "images/your-image.jpg",
 *   "imageAlt": "Description of image",
 *   "summary": "A brief 1-2 sentence summary.",
 *   "content": "Full content of the post (can be the same as summary for cards)"
 * }
 */

class NewsCMS {
    constructor(options = {}) {
        this.dataUrl = options.dataUrl || 'data/news-posts.json';
        this.containerSelector = options.containerSelector || '.news-grid';
        this.filterSelector = options.filterSelector || '.news-filter';
        this.posts = [];
        this.filteredPosts = [];
        this.currentFilter = 'all';
    }

    async init() {
        try {
            await this.loadPosts();
            this.render();
            this.setupFilters();
        } catch (error) {
            console.error('Failed to initialize News CMS:', error);
            this.showError();
        }
    }

    async loadPosts() {
        const response = await fetch(this.dataUrl);
        if (!response.ok) {
            throw new Error(`Failed to load news posts: ${response.status}`);
        }
        const data = await response.json();
        this.posts = data.posts || [];
        // Sort by date descending (newest first)
        this.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.filteredPosts = [...this.posts];
    }

    getYears() {
        const years = [...new Set(this.posts.map(post => post.year))];
        return years.sort((a, b) => b - a);
    }

    filterByYear(year) {
        this.currentFilter = year;
        if (year === 'all') {
            this.filteredPosts = [...this.posts];
        } else {
            this.filteredPosts = this.posts.filter(post => post.year === parseInt(year));
        }
        this.render();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    createPostCard(post) {
        const article = document.createElement('article');
        article.className = 'news-card';
        article.dataset.postId = post.id;
        article.dataset.year = post.year;

        article.innerHTML = `
            <div class="news-image">
                <img src="${post.image}" alt="${post.imageAlt}" loading="lazy">
            </div>
            <div class="news-content">
                <span class="news-date">${post.year}</span>
                <h2>${post.title}</h2>
                <p>${post.summary}</p>
            </div>
        `;

        return article;
    }

    render() {
        const container = document.querySelector(this.containerSelector);
        if (!container) {
            console.error('News container not found:', this.containerSelector);
            return;
        }

        container.innerHTML = '';

        if (this.filteredPosts.length === 0) {
            container.innerHTML = '<p class="no-posts">No news posts found.</p>';
            return;
        }

        this.filteredPosts.forEach(post => {
            container.appendChild(this.createPostCard(post));
        });
    }

    setupFilters() {
        const filterContainer = document.querySelector(this.filterSelector);
        if (!filterContainer) return;

        const years = this.getYears();

        filterContainer.innerHTML = `
            <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-year="all">All</button>
            ${years.map(year => `
                <button class="filter-btn ${this.currentFilter === year ? 'active' : ''}" data-year="${year}">${year}</button>
            `).join('')}
        `;

        filterContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                // Update active state
                filterContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                // Filter posts
                const year = e.target.dataset.year;
                this.filterByYear(year);
            }
        });
    }

    showError() {
        const container = document.querySelector(this.containerSelector);
        if (container) {
            container.innerHTML = '<p class="error-message">Unable to load news posts. Please try again later.</p>';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const newsGrid = document.querySelector('.news-grid');
    if (newsGrid && newsGrid.dataset.cms === 'true') {
        const newsCMS = new NewsCMS();
        newsCMS.init();
    }
});
