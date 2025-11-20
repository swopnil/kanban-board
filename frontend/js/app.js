// Main Application Controller
class App {
    constructor() {
        this.isInitialized = false;
        this.currentView = 'welcome';
    }

    // Initialize the application
    async init() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing KanbanFlow application...');
            
            // Initialize managers
            await auth.init();
            
            // Initialize other managers if they exist
            if (typeof ticketManager !== 'undefined') {
                ticketManager.init();
            }
            if (typeof dashboardManager !== 'undefined') {
                dashboardManager.init();
            }
            if (typeof boardManager !== 'undefined') {
                // Board manager doesn't need explicit init
                console.log('Board manager loaded');
            }
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            this.isInitialized = true;
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Application initialization error:', error);
            showError('Failed to initialize application');
        }
    }

    // Setup global event listeners
    setupGlobalEventListeners() {
        // Modal close handlers
        this.setupModalHandlers();
        
        // Navigation handlers
        this.setupNavigationHandlers();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Search functionality
        this.setupSearchHandlers();
        
        // Window resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    // Setup modal event handlers
    setupModalHandlers() {
        // Close modals when clicking outside
        document.addEventListener('click', (event) => {
            const modals = document.querySelectorAll('.modal.show');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // Close modals with escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const openModals = document.querySelectorAll('.modal.show');
                openModals.forEach(modal => {
                    modal.classList.remove('show');
                });
            }
        });
    }

    // Setup navigation handlers
    setupNavigationHandlers() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state) {
                this.handleNavigation(event.state);
            }
        });
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts when no input is focused
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + K for search
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // Ctrl/Cmd + N for new ticket (when on board view)
            if ((event.ctrlKey || event.metaKey) && event.key === 'n' && this.currentView === 'board') {
                event.preventDefault();
                openCreateTicketModal();
            }

            // Ctrl/Cmd + B for new board (when on dashboard)
            if ((event.ctrlKey || event.metaKey) && event.key === 'b' && this.currentView === 'dashboard') {
                event.preventDefault();
                openCreateBoardModal();
            }

            // Escape to go back to dashboard
            if (event.key === 'Escape' && this.currentView !== 'dashboard') {
                showDashboard();
            }
        });
    }

    // Setup search handlers
    setupSearchHandlers() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (event) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(event.target.value);
                }, 300); // Debounce search
            });
        }
    }

    // Handle search functionality
    handleSearch(query) {
        // For now, just log the search - could be extended to search tickets/boards
        if (query.trim()) {
            console.log('Searching for:', query);
            // TODO: Implement search functionality
        }
    }

    // Handle navigation state changes
    handleNavigation(state) {
        switch (state.view) {
            case 'dashboard':
                showDashboard();
                break;
            case 'board':
                if (state.boardId) {
                    boardManager.openBoard(state.boardId);
                }
                break;
            default:
                showDashboard();
        }
    }

    // Handle window resize
    handleResize() {
        // Handle responsive behavior
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (window.innerWidth < 1024) {
            // Mobile behavior - could add sidebar toggle
        }
    }

    // Set current view
    setCurrentView(view, data = {}) {
        this.currentView = view;
        
        // Update URL without reloading
        const state = { view, ...data };
        const url = this.generateURL(view, data);
        history.pushState(state, '', url);
    }

    // Generate URL for navigation
    generateURL(view, data = {}) {
        switch (view) {
            case 'board':
                return `#/board/${data.boardId}`;
            case 'dashboard':
            default:
                return '#/dashboard';
        }
    }

    // Show loading state
    showGlobalLoading() {
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = `
            <div class="global-loading">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        document.body.appendChild(loader);
    }

    // Hide loading state
    hideGlobalLoading() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.remove();
        }
    }

    // Handle app errors
    handleError(error, context = '') {
        console.error(`App Error ${context}:`, error);
        
        // Show user-friendly error message
        const message = error.message || 'An unexpected error occurred';
        showError(message);
        
        // Could send to error reporting service
        // this.reportError(error, context);
    }

    // Get app version/info
    getInfo() {
        return {
            name: 'KanbanFlow',
            version: '1.0.0',
            author: 'Your Name',
            description: 'A Jira-like kanban board application'
        };
    }
}

// Global utility functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        
        // Reset forms when closing modals
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
        
        // Reset ticket manager state if closing ticket modals
        if (modalId === 'createTicketModal') {
            ticketManager.isCreating = false;
            ticketManager.isEditing = false;
            
            // Reset modal title and button text
            const title = modal.querySelector('.modal-header h2');
            const submitBtn = modal.querySelector('button[type="submit"]');
            if (title) title.textContent = 'Create New Ticket';
            if (submitBtn) submitBtn.textContent = 'Create Ticket';
        }
    }
}

function openCreateModal() {
    // Determine what to create based on current view
    if (app.currentView === 'board') {
        openCreateTicketModal();
    } else {
        openCreateBoardModal();
    }
}

function showProfile() {
    if (currentUser) {
        alert(`Profile: ${currentUser.name} (${currentUser.email})\nRole: ${currentUser.role}`);
        // TODO: Implement profile modal
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

// Close user dropdown when clicking outside
document.addEventListener('click', (event) => {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (dropdown && !userMenu.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// Create and initialize the main app instance
const app = new App();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentUser) {
        // Refresh data when page becomes visible again
        if (app.currentView === 'dashboard' && dashboardManager) {
            dashboardManager.refresh();
        } else if (app.currentView === 'board' && boardManager) {
            boardManager.refresh();
        }
    }
});

// Handle online/offline events
window.addEventListener('online', () => {
    showSuccess('Connection restored');
});

window.addEventListener('offline', () => {
    showError('Connection lost. Some features may not work.');
});

// Global error handler for unhandled promises
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    app.handleError(event.reason, 'Unhandled Promise');
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    app.handleError(event.error, 'Global Error');
});

// Export app for debugging
window.app = app;

console.log('KanbanFlow application loaded successfully!');
console.log('App info:', app.getInfo());