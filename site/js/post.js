/**
 * Blog Post Page Handler for Omotani Caring Foundation
 *
 * This script handles loading and displaying individual blog posts.
 * Posts are loaded based on the 'id' URL parameter.
 *
 * Usage: post.html?id=post-id-here
 */

class BlogPost {
    constructor() {
        this.dataUrl = 'data/news-posts.json';
        this.posts = [];
        this.currentPost = null;
        this.currentIndex = -1;
    }

    async init() {
        try {
            const postId = this.getPostIdFromUrl();
            if (!postId) {
                this.showError('No post specified');
                return;
            }

            await this.loadPosts();
            this.findCurrentPost(postId);

            if (!this.currentPost) {
                this.showError('Post not found');
                return;
            }

            this.render();
            this.setupNavigation();
        } catch (error) {
            console.error('Failed to load post:', error);
            this.showError('Unable to load post');
        }
    }

    getPostIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async loadPosts() {
        const response = await fetch(this.dataUrl);
        if (!response.ok) {
            throw new Error(`Failed to load posts: ${response.status}`);
        }
        const data = await response.json();
        this.posts = data.posts || [];
        // Sort by date (newest first)
        this.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    findCurrentPost(postId) {
        this.currentIndex = this.posts.findIndex(post => post.id === postId);
        if (this.currentIndex !== -1) {
            this.currentPost = this.posts[this.currentIndex];
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    }

    formatContent(content) {
        if (!content) return '';

        // Split by double newlines to create paragraphs
        const paragraphs = content.split(/\n\n+/);

        return paragraphs
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => {
                // Replace single newlines with <br>
                p = p.replace(/\n/g, '<br>');
                return `<p>${p}</p>`;
            })
            .join('');
    }

    render() {
        const post = this.currentPost;

        // Update page title
        document.title = `${post.title} — Omotani CARING Foundation`;

        // Update meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', post.summary || post.title);
        }

        // Category badge
        const categoryBadge = document.querySelector('.category-text');
        if (categoryBadge) {
            categoryBadge.textContent = post.category;
        }

        // Title
        const titleEl = document.querySelector('.post-title');
        if (titleEl) {
            titleEl.textContent = post.title;
        }

        // Image
        const imageContainer = document.querySelector('.post-image-container');
        const imageEl = document.querySelector('.post-image');
        const captionEl = document.querySelector('.post-image-caption');

        if (post.image && post.image.trim() !== '') {
            if (imageEl) {
                imageEl.src = post.image;
                imageEl.alt = post.imageAlt || post.title;
            }
            if (captionEl) {
                captionEl.textContent = post.imageAlt || '';
            }
            if (imageContainer) {
                imageContainer.style.display = 'flex';
            }
        } else {
            // Hide image container if no image
            if (imageContainer) {
                imageContainer.style.display = 'none';
            }
        }

        // Author
        const authorEl = document.querySelector('.post-author');
        if (authorEl) {
            authorEl.textContent = `By ${post.author}`;
        }

        // Date
        const dateEl = document.querySelector('.post-date');
        if (dateEl) {
            dateEl.textContent = this.formatDate(post.date);
        }

        // Content
        const contentEl = document.querySelector('.post-content');
        if (contentEl) {
            contentEl.innerHTML = this.formatContent(post.content);
        }
    }

    setupNavigation() {
        const prevLink = document.querySelector('.nav-prev');
        const nextLink = document.querySelector('.nav-next');

        // Previous post (newer - lower index)
        if (this.currentIndex > 0) {
            const prevPost = this.posts[this.currentIndex - 1];
            if (prevLink) {
                prevLink.href = `post.html?id=${prevPost.id}`;
                prevLink.classList.remove('disabled');
            }
        } else {
            if (prevLink) {
                prevLink.classList.add('disabled');
                prevLink.removeAttribute('href');
            }
        }

        // Next post (older - higher index)
        if (this.currentIndex < this.posts.length - 1) {
            const nextPost = this.posts[this.currentIndex + 1];
            if (nextLink) {
                nextLink.href = `post.html?id=${nextPost.id}`;
                nextLink.classList.remove('disabled');
            }
        } else {
            if (nextLink) {
                nextLink.classList.add('disabled');
                nextLink.removeAttribute('href');
            }
        }
    }

    showError(message) {
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = `
                <section class="post-section">
                    <div class="post-container post-error">
                        <h2>Oops!</h2>
                        <p>${message}</p>
                        <a href="news-updates.html">← Back to News + Updates</a>
                    </div>
                </section>
            `;
        }
        document.title = 'Post Not Found — Omotani CARING Foundation';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const blogPost = new BlogPost();
    blogPost.init();
});
