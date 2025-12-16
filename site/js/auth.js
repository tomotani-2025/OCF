/**
 * Authentication Module for Omotani Caring Foundation Admin
 *
 * Provides secure login/logout functionality using Supabase Auth.
 * Only authenticated users can access the admin panel.
 */

const SUPABASE_URL = 'https://wafdatyvcgimpsetelyb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZmRhdHl2Y2dpbXBzZXRlbHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY2NjcsImV4cCI6MjA4MTA3MjY2N30.khU-SsaThjovP0H29DWHuxBraiYS0YWY2c8rTEEir4o';

// Auth API using Supabase Auth REST endpoints
const authAPI = {
    // Get stored session
    getSession() {
        const session = localStorage.getItem('supabase_session');
        if (!session) return null;

        try {
            const parsed = JSON.parse(session);
            // Check if session is expired
            if (parsed.expires_at && new Date(parsed.expires_at * 1000) < new Date()) {
                localStorage.removeItem('supabase_session');
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    },

    // Store session
    setSession(session) {
        if (session) {
            localStorage.setItem('supabase_session', JSON.stringify(session));
        } else {
            localStorage.removeItem('supabase_session');
        }
    },

    // Get current user
    getUser() {
        const session = this.getSession();
        return session?.user || null;
    },

    // Get access token
    getAccessToken() {
        const session = this.getSession();
        return session?.access_token || null;
    },

    // Sign in with email and password
    async signIn(email, password) {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error_description || data.msg || 'Sign in failed');
        }

        // Store the session
        this.setSession(data);
        return data;
    },

    // Sign out
    async signOut() {
        const token = this.getAccessToken();

        if (token) {
            try {
                await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Logout API error:', error);
            }
        }

        this.setSession(null);
    },

    // Refresh token if needed
    async refreshSession() {
        const session = this.getSession();
        if (!session?.refresh_token) return null;

        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: session.refresh_token })
            });

            if (!response.ok) {
                this.setSession(null);
                return null;
            }

            const data = await response.json();
            this.setSession(data);
            return data;
        } catch {
            this.setSession(null);
            return null;
        }
    },

    // Check if user is authenticated
    isAuthenticated() {
        return this.getSession() !== null;
    }
};

// Admin Authentication Controller
class AdminAuth {
    constructor() {
        this.loginModal = null;
        this.adminContent = null;
        this.logoutBtn = null;
        this.userDisplay = null;
    }

    init() {
        this.createLoginModal();
        this.adminContent = document.querySelector('.admin-container');

        // Hide admin content initially until auth is checked
        if (this.adminContent) {
            this.adminContent.style.display = 'none';
        }

        // Check authentication on page load
        this.checkAuth();

        // Add logout button to header
        this.addLogoutButton();
    }

    createLoginModal() {
        // Create login modal if it doesn't exist
        if (document.getElementById('login-modal')) {
            this.loginModal = document.getElementById('login-modal');
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'modal login-modal';
        modal.hidden = true; // Start hidden, will be shown by checkAuth if needed
        modal.innerHTML = `
            <div class="modal-backdrop login-backdrop"></div>
            <div class="modal-content login-modal-content">
                <div class="login-header">
                    <img src="images/logo/OCF-Badge-BlackRed.svg" alt="OCF" class="login-logo">
                    <h2>Admin Login</h2>
                    <p>Sign in to manage the website</p>
                </div>
                <form id="login-form" class="login-form">
                    <div class="form-group">
                        <label for="login-email">Email</label>
                        <input type="email" id="login-email" required placeholder="Enter your email" autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label for="login-password">Password</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="login-password" required placeholder="Enter your password" autocomplete="current-password">
                            <button type="button" class="password-toggle" aria-label="Toggle password visibility">
                                <svg class="eye-open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <svg class="eye-closed" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div id="login-error" class="login-error" hidden></div>
                    <button type="submit" id="login-submit" class="btn btn-primary btn-login">
                        <span class="btn-text">Sign In</span>
                        <span class="btn-spinner" hidden>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12">
                                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                                </circle>
                            </svg>
                        </span>
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        this.loginModal = modal;

        // Setup event listeners
        this.setupLoginListeners();
    }

    setupLoginListeners() {
        const form = document.getElementById('login-form');
        const passwordToggle = this.loginModal.querySelector('.password-toggle');
        const passwordInput = document.getElementById('login-password');

        // Form submission
        form.addEventListener('submit', (e) => this.handleLogin(e));

        // Password visibility toggle
        passwordToggle.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            passwordToggle.querySelector('.eye-open').style.display = isPassword ? 'none' : 'block';
            passwordToggle.querySelector('.eye-closed').style.display = isPassword ? 'block' : 'none';
        });
    }

    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('login-submit');
        const errorDiv = document.getElementById('login-error');

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').hidden = true;
        submitBtn.querySelector('.btn-spinner').hidden = false;
        errorDiv.hidden = true;

        try {
            await authAPI.signIn(email, password);
            this.showAdminContent();
            this.updateUserDisplay();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.hidden = false;
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').hidden = false;
            submitBtn.querySelector('.btn-spinner').hidden = true;
        }
    }

    addLogoutButton() {
        const nav = document.querySelector('.nav-list');
        if (!nav) return;

        // Create logout button container
        const logoutLi = document.createElement('li');
        logoutLi.className = 'admin-user-menu';
        logoutLi.innerHTML = `
            <div class="admin-user-info">
                <span class="admin-user-email" id="admin-user-email"></span>
                <button type="button" id="logout-btn" class="btn btn-outline btn-logout">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Logout
                </button>
            </div>
        `;
        nav.appendChild(logoutLi);

        this.logoutBtn = document.getElementById('logout-btn');
        this.userDisplay = document.getElementById('admin-user-email');

        this.logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    async handleLogout() {
        await authAPI.signOut();
        this.hideAdminContent();
        // Clear form
        document.getElementById('login-form').reset();
        document.getElementById('login-error').hidden = true;
    }

    checkAuth() {
        if (authAPI.isAuthenticated()) {
            this.showAdminContent();
            this.updateUserDisplay();
        } else {
            this.hideAdminContent();
        }
    }

    showAdminContent() {
        this.loginModal.hidden = true;
        if (this.adminContent) {
            this.adminContent.style.display = '';
        }
        if (this.logoutBtn) {
            this.logoutBtn.closest('.admin-user-menu').style.display = '';
        }
    }

    hideAdminContent() {
        this.loginModal.hidden = false;
        if (this.adminContent) {
            this.adminContent.style.display = 'none';
        }
        if (this.logoutBtn) {
            this.logoutBtn.closest('.admin-user-menu').style.display = 'none';
        }
    }

    updateUserDisplay() {
        const user = authAPI.getUser();
        if (this.userDisplay && user) {
            this.userDisplay.textContent = user.email;
        }
    }
}

// Initialize auth when DOM is ready
let adminAuth;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on admin page
    if (document.querySelector('.admin-page')) {
        adminAuth = new AdminAuth();
        adminAuth.init();
    }
});

// Export for use
window.authAPI = authAPI;
window.adminAuth = adminAuth;
