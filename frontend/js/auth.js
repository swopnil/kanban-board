// Authentication Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthModalOpen = false;
        this.authMode = 'signin'; // 'signin' or 'signup'
    }

    // Initialize authentication
    async init() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await api.getCurrentUser();
                this.setCurrentUser(response.user);
                this.showApp();
            } catch (error) {
                console.error('Invalid token:', error);
                this.logout();
            }
        } else {
            this.showWelcomeScreen();
        }
    }

    // Set current user
    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            document.getElementById('userName').textContent = user.name;
        }
    }

    // Show welcome screen
    showWelcomeScreen() {
        document.getElementById('welcomeScreen').style.display = 'block';
        document.getElementById('app').style.display = 'none';
    }

    // Show main app
    showApp() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        // Initialize dashboard when app is shown
        if (window.dashboardManager) {
            window.dashboardManager.init();
        }
    }

    // Open authentication modal
    openAuthModal(mode = 'signin') {
        this.authMode = mode;
        this.isAuthModalOpen = true;
        
        const modal = document.getElementById('authModal');
        const title = document.getElementById('authTitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const switchText = document.getElementById('authSwitchText');
        const nameGroup = document.getElementById('nameGroup');
        const roleGroup = document.getElementById('roleGroup');

        if (mode === 'signin') {
            title.textContent = 'Sign In to KanbanFlow';
            submitBtn.textContent = 'Sign In';
            switchText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Sign up</a>';
            nameGroup.style.display = 'none';
            roleGroup.style.display = 'none';
            document.getElementById('name').removeAttribute('required');
        } else {
            title.textContent = 'Create Your Account';
            submitBtn.textContent = 'Sign Up';
            switchText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Sign in</a>';
            nameGroup.style.display = 'block';
            roleGroup.style.display = 'block';
            document.getElementById('name').setAttribute('required', 'required');
        }

        modal.classList.add('show');
    }

    // Close authentication modal
    closeAuthModal() {
        this.isAuthModalOpen = false;
        const modal = document.getElementById('authModal');
        modal.classList.remove('show');
        
        // Clear form
        document.getElementById('authForm').reset();
        this.clearFormErrors();
    }

    // Toggle between signin and signup
    toggleAuthMode() {
        this.authMode = this.authMode === 'signin' ? 'signup' : 'signin';
        this.closeAuthModal();
        this.openAuthModal(this.authMode);
    }

    // Handle authentication form submission
    async handleAuthSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const submitBtn = document.getElementById('authSubmitBtn');
        
        // Clear previous errors
        this.clearFormErrors();
        
        // Get form values
        const email = formData.get('email').trim();
        const password = formData.get('password').trim();
        
        // Validate
        if (!email || !password) {
            this.showFormError('Email and password are required');
            return;
        }

        if (password.length < 6) {
            this.showFormError('Password must be at least 6 characters');
            return;
        }

        try {
            setLoading(submitBtn, true);
            
            let response;
            if (this.authMode === 'signin') {
                response = await api.signin({ email, password });
            } else {
                const name = formData.get('name').trim();
                const role = formData.get('role');
                
                if (!name) {
                    this.showFormError('Full name is required');
                    return;
                }
                
                response = await api.signup({ email, password, name, role });
            }

            // Store token and user data
            api.setToken(response.token);
            this.setCurrentUser(response.user);
            
            // Show success message
            showSuccess(`${this.authMode === 'signin' ? 'Signed in' : 'Account created'} successfully!`);
            
            // Close modal and show app
            this.closeAuthModal();
            this.showApp();
            
        } catch (error) {
            console.error('Auth error:', error);
            this.showFormError(error.message || 'Authentication failed');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // Show form error
    showFormError(message) {
        // Remove existing error
        const existingError = document.querySelector('.auth-error');
        if (existingError) {
            existingError.remove();
        }

        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error error-message';
        errorDiv.textContent = message;
        
        // Insert after form
        const form = document.getElementById('authForm');
        form.parentNode.insertBefore(errorDiv, form.nextSibling);
    }

    // Clear form errors
    clearFormErrors() {
        const errors = document.querySelectorAll('.auth-error');
        errors.forEach(error => error.remove());
    }

    // Logout user
    logout() {
        // Clear stored data
        localStorage.removeItem('authToken');
        api.setToken(null);
        this.currentUser = null;
        
        // Reset UI
        this.showWelcomeScreen();
        
        // Clear any cached data
        if (window.dashboardManager) {
            window.dashboardManager.reset();
        }
        if (window.boardManager) {
            window.boardManager.reset();
        }
        
        showSuccess('Logged out successfully');
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser && !!api.getToken();
    }

    // Check if user has admin role
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'Admin';
    }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Global functions for HTML onclick handlers
function openAuthModal(mode) {
    authManager.openAuthModal(mode);
}

function closeAuthModal() {
    authManager.closeAuthModal();
}

function toggleAuthMode() {
    authManager.toggleAuthMode();
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        authManager.logout();
    }
}

// User menu toggle
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

// Close user menu when clicking outside
document.addEventListener('click', (event) => {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (userMenu && !userMenu.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// Handle auth form submission
document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', (e) => authManager.handleAuthSubmit(e));
    }
    
    // Close modal when clicking outside
    document.addEventListener('click', (event) => {
        const modal = document.getElementById('authModal');
        if (event.target === modal && authManager.isAuthModalOpen) {
            authManager.closeAuthModal();
        }
    });
    
    // Close modal with escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && authManager.isAuthModalOpen) {
            authManager.closeAuthModal();
        }
    });
});