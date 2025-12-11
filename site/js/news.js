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
 *   "category": "Batwa",  // Options: Batwa, Bwindi, Nepal, Base Camp For Veterans
 *   "author": "Les Omotani",
 *   "image": "images/your-image.jpg",
 *   "imageAlt": "Description of image",
 *   "summary": "A brief 1-2 sentence summary.",
 *   "content": "Full content of the post"
 * }
 */

class NewsCMS {
    constructor(options = {}) {
        this.dataUrl = options.dataUrl || 'data/news-posts.json';
        this.containerSelector = options.containerSelector || '.news-grid';
        this.filterSelector = options.filterSelector || '.news-filter-links';
        this.sortSelector = options.sortSelector || '.news-sort-select';
        this.paginationSelector = options.paginationSelector || '.news-pagination';
        this.posts = [];
        this.filteredPosts = [];
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.currentPage = 1;
        this.postsPerPage = 6;
        this.categories = ['Batwa', 'Bwindi', 'Nepal', 'Base Camp For Veterans'];
    }

    async init() {
        try {
            await this.loadPosts();
            this.render();
            this.setupFilters();
            this.setupSort();
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
        this.sortPosts();
        this.filteredPosts = [...this.posts];
    }

    sortPosts() {
        if (this.currentSort === 'newest') {
            this.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else {
            this.posts.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
    }

    getCategoryCounts() {
        const counts = {};
        this.categories.forEach(cat => {
            counts[cat] = this.posts.filter(post => post.category === cat).length;
        });
        return counts;
    }

    filterByCategory(category) {
        this.currentFilter = category;
        this.currentPage = 1;
        if (category === 'all') {
            this.filteredPosts = [...this.posts];
        } else {
            this.filteredPosts = this.posts.filter(post => post.category === category);
        }
        this.sortFilteredPosts();
        this.render();
        this.renderPagination();
    }

    sortFilteredPosts() {
        if (this.currentSort === 'newest') {
            this.filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else {
            this.filteredPosts.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = date.getDate();
        const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                       day === 2 || day === 22 ? 'nd' :
                       day === 3 || day === 23 ? 'rd' : 'th';
        return `${months[date.getMonth()]} ${day}${suffix}, ${date.getFullYear()}`;
    }

    createPostCard(post) {
        const article = document.createElement('article');
        article.className = 'news-card';
        article.dataset.postId = post.id;
        article.dataset.category = post.category;

        article.innerHTML = `
            <a href="post.html?id=${post.id}" class="card-header">
                <img src="${post.image}" alt="${post.imageAlt}" loading="lazy">
                <div class="card-date">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.33333 1.66667H7.5V0.833333C7.5 0.375 7.125 0 6.66667 0C6.20833 0 5.83333 0.375 5.83333 0.833333V1.66667H4.16667V0.833333C4.16667 0.375 3.79167 0 3.33333 0C2.875 0 2.5 0.375 2.5 0.833333V1.66667H1.66667C0.75 1.66667 0 2.41667 0 3.33333V8.33333C0 9.25 0.75 10 1.66667 10H8.33333C9.25 10 10 9.25 10 8.33333V3.33333C10 2.41667 9.25 1.66667 8.33333 1.66667ZM8.33333 8.33333H1.66667V4.16667H8.33333V8.33333Z" fill="white"/>
                    </svg>
                    <span>${this.formatDate(post.date)}</span>
                </div>
            </a>
            <div class="card-body">
                <span class="card-category">${post.category}</span>
                <div class="card-text">
                    <a href="post.html?id=${post.id}" class="card-title-link"><h2>${post.title}</h2></a>
                    <p>${post.summary}</p>
                    <div class="card-divider"></div>
                </div>
                <div class="card-footer">
                    <span class="card-author">By ${post.author}</span>
                    <a href="post.html?id=${post.id}" class="read-more">
                        <span>Read More</span>
                        <svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L26 13L18 20" stroke="#EF3A4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M4 13H26" stroke="#EF3A4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </a>
                </div>
            </div>
        `;

        // Make entire card clickable
        article.addEventListener('click', (e) => {
            // Don't navigate if clicking on a link (let the link handle it)
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            window.location.href = `post.html?id=${post.id}`;
        });

        return article;
    }

    getPaginatedPosts() {
        const start = (this.currentPage - 1) * this.postsPerPage;
        const end = start + this.postsPerPage;
        return this.filteredPosts.slice(start, end);
    }

    getTotalPages() {
        return Math.ceil(this.filteredPosts.length / this.postsPerPage);
    }

    render() {
        const container = document.querySelector(this.containerSelector);
        if (!container) {
            console.error('News container not found:', this.containerSelector);
            return;
        }

        container.innerHTML = '';

        const paginatedPosts = this.getPaginatedPosts();

        if (paginatedPosts.length === 0) {
            container.innerHTML = '<p class="no-posts">No news posts found.</p>';
            return;
        }

        paginatedPosts.forEach(post => {
            container.appendChild(this.createPostCard(post));
        });

        this.renderPagination();
    }

    setupFilters() {
        const filterContainer = document.querySelector(this.filterSelector);
        if (!filterContainer) return;

        const counts = this.getCategoryCounts();
        const totalPosts = this.posts.length;

        filterContainer.innerHTML = `
            <a href="#" class="filter-link ${this.currentFilter === 'all' ? 'active' : ''}" data-category="all">
                <span class="filter-text">All</span>
                <span class="filter-count">${totalPosts}</span>
            </a>
            ${this.categories.map(cat => `
                <a href="#" class="filter-link ${this.currentFilter === cat ? 'active' : ''}" data-category="${cat}">
                    <span class="filter-text">${cat}</span>
                    <span class="filter-count">${counts[cat]}</span>
                </a>
            `).join('')}
        `;

        filterContainer.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('filter-link') || e.target.closest('.filter-link')) {
                const link = e.target.classList.contains('filter-link') ? e.target : e.target.closest('.filter-link');
                filterContainer.querySelectorAll('.filter-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const category = link.dataset.category;
                this.filterByCategory(category);
            }
        });
    }

    setupSort() {
        const sortContainer = document.querySelector(this.sortSelector);
        if (!sortContainer) return;

        sortContainer.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortFilteredPosts();
            this.currentPage = 1;
            this.render();
        });
    }

    renderPagination() {
        const container = document.querySelector(this.paginationSelector);
        if (!container) return;

        const totalPages = this.getTotalPages();
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <button class="pagination-arrow prev" ${this.currentPage === 1 ? 'disabled' : ''}>
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 1L1 7L7 13" stroke="#EF3A4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M1 7H17" stroke="#EF3A4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <button class="pagination-page ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
            `;
        }

        paginationHTML += `
            <button class="pagination-arrow next" ${this.currentPage === totalPages ? 'disabled' : ''}>
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 1L17 7L11 13" stroke="#EF3A4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M17 7H1" stroke="#EF3A4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;

        container.innerHTML = paginationHTML;

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn || btn.disabled) return;

            if (btn.classList.contains('prev')) {
                this.currentPage = Math.max(1, this.currentPage - 1);
            } else if (btn.classList.contains('next')) {
                this.currentPage = Math.min(totalPages, this.currentPage + 1);
            } else if (btn.classList.contains('pagination-page')) {
                this.currentPage = parseInt(btn.dataset.page);
            }
            this.render();
            // Scroll to top of cards section
            document.querySelector('.card-section')?.scrollIntoView({ behavior: 'smooth' });
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
