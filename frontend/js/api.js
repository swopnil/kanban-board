// API Configuration
const API_BASE_URL = 'http://localhost:5001/api';

// API Service Layer
class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('authToken');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    // Get authentication token
    getToken() {
        return this.token || localStorage.getItem('authToken');
    }

    // Get headers with authentication
    getHeaders(includeContentType = true) {
        const headers = {};
        
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    // Make HTTP request
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Authentication endpoints
    async signup(userData) {
        return this.makeRequest('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async signin(credentials) {
        return this.makeRequest('/auth/signin', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async getCurrentUser() {
        return this.makeRequest('/auth/me');
    }

    // Board endpoints
    async getBoards() {
        return this.makeRequest('/boards');
    }

    async getBoardById(boardId) {
        return this.makeRequest(`/boards/${boardId}`);
    }

    async createBoard(boardData) {
        return this.makeRequest('/boards', {
            method: 'POST',
            body: JSON.stringify(boardData)
        });
    }

    async inviteUserToBoard(boardId, email) {
        return this.makeRequest(`/boards/${boardId}/invite`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async acceptBoardInvitation(boardId, email) {
        return this.makeRequest(`/boards/${boardId}/accept-invitation`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    // Ticket endpoints
    async getTicketsByBoard(boardId, filters = {}) {
        const params = new URLSearchParams(filters);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.makeRequest(`/tickets/board/${boardId}${query}`);
    }

    async getTicketById(ticketId) {
        return this.makeRequest(`/tickets/${ticketId}`);
    }

    async createTicket(ticketData) {
        return this.makeRequest('/tickets', {
            method: 'POST',
            body: JSON.stringify(ticketData)
        });
    }

    async updateTicket(ticketId, updates) {
        return this.makeRequest(`/tickets/${ticketId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteTicket(ticketId) {
        return this.makeRequest(`/tickets/${ticketId}`, {
            method: 'DELETE'
        });
    }

    async addCommentToTicket(ticketId, comment) {
        return this.makeRequest(`/tickets/${ticketId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text: comment })
        });
    }
}

// Create a global API instance
const api = new ApiService();

// Utility functions for handling API responses
const showError = (message) => {
    // Create or update error notification
    const existingError = document.querySelector('.error-notification');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #DE350B;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        box-shadow: 0 4px 8px rgba(9, 30, 66, 0.25);
        z-index: 3000;
        max-width: 300px;
        word-wrap: break-word;
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
};

const showSuccess = (message) => {
    // Create or update success notification
    const existingSuccess = document.querySelector('.success-notification');
    if (existingSuccess) {
        existingSuccess.remove();
    }

    const successDiv = document.createElement('div');
    successDiv.className = 'success-notification';
    successDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #36B37E;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        box-shadow: 0 4px 8px rgba(9, 30, 66, 0.25);
        z-index: 3000;
        max-width: 300px;
        word-wrap: break-word;
    `;
    successDiv.textContent = message;

    document.body.appendChild(successDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (successDiv && successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
};

// Loading state management
const setLoading = (element, isLoading) => {
    if (isLoading) {
        element.classList.add('loading');
        element.style.pointerEvents = 'none';
    } else {
        element.classList.remove('loading');
        element.style.pointerEvents = 'auto';
    }
};

// Format date helper
const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
};

// Format due date helper
const formatDueDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
        return 'Due today';
    } else if (diffDays === 1) {
        return 'Due tomorrow';
    } else {
        return `Due in ${diffDays} days`;
    }
};

// Get user initials for avatar
const getUserInitials = (name) => {
    if (!name) return '?';
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
};

// Escape HTML to prevent XSS
const escapeHtml = (text) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { api, showError, showSuccess, setLoading, formatDate, formatDueDate, getUserInitials, escapeHtml };
}