// Dashboard Management
class DashboardManager {
    constructor() {
        this.boards = [];
        this.stats = {
            myTickets: 0,
            inProgress: 0,
            completed: 0
        };
    }

    // Initialize dashboard
    async init() {
        if (!currentUser) {
            return;
        }

        try {
            await this.loadDashboardData();
            this.renderDashboard();
            this.setupEventListeners();
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            showError('Failed to load dashboard data');
        }
    }

    // Load dashboard data
    async loadDashboardData() {
        try {
            // Load boards
            const boardsResponse = await api.getBoards();
            this.boards = boardsResponse.boards || [];

            // Calculate stats from all boards
            await this.calculateStats();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        }
    }

    // Calculate dashboard statistics
    async calculateStats() {
        let myTickets = 0;
        let inProgress = 0;
        let completed = 0;
        
        const currentUserId = currentUser.id || currentUser._id;

        try {
            // Get tickets from all boards
            for (const board of this.boards) {
                const ticketsResponse = await api.getTickets(board._id);
                const tickets = ticketsResponse.tickets || [];

                for (const ticket of tickets) {
                    // Count tickets assigned to current user
                    if (ticket.assignedTo && ticket.assignedTo._id === currentUserId) {
                        myTickets++;
                    }

                    // Count by status
                    switch (ticket.status) {
                        case 'in process':
                            inProgress++;
                            break;
                        case 'completed':
                            completed++;
                            break;
                    }
                }
            }

            this.stats = { myTickets, inProgress, completed };
        } catch (error) {
            console.error('Error calculating stats:', error);
            // Use default values if calculation fails
            this.stats = { myTickets: 0, inProgress: 0, completed: 0 };
        }
    }

    // Render dashboard
    renderDashboard() {
        this.renderStats();
        this.renderBoards();
        this.renderRecentBoards();
    }

    // Render statistics cards
    renderStats() {
        document.getElementById('myTicketsCount').textContent = this.stats.myTickets;
        document.getElementById('inProgressCount').textContent = this.stats.inProgress;
        document.getElementById('completedCount').textContent = this.stats.completed;
    }

    // Render boards grid
    renderBoards() {
        const boardsList = document.getElementById('boardsList');
        
        if (!this.boards.length) {
            boardsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-layer-group"></i>
                    <h3>No boards yet</h3>
                    <p>Create your first board to get started</p>
                    <button class="btn btn-primary" onclick="openCreateBoardModal()">
                        <i class="fas fa-plus"></i>
                        Create Board
                    </button>
                </div>
            `;
            return;
        }

        boardsList.innerHTML = this.boards.map(board => `
            <div class="board-card" onclick="openBoard('${board._id}')">
                <div class="board-card-header">
                    <h3>${escapeHtml(board.name)}</h3>
                    <p>${escapeHtml(board.description || 'No description')}</p>
                </div>
                <div class="board-card-footer">
                    <span>Created ${formatDate(board.createdAt)}</span>
                    <span>${(board.members || []).length} member${(board.members || []).length !== 1 ? 's' : ''}</span>
                </div>
            </div>
        `).join('');
    }

    // Render recent boards in sidebar
    renderRecentBoards() {
        const recentBoards = document.getElementById('recentBoards');
        const recentBoardsList = this.boards.slice(0, 5); // Show 5 most recent

        if (!recentBoardsList.length) {
            recentBoards.innerHTML = '<p class="text-muted">No recent boards</p>';
            return;
        }

        recentBoards.innerHTML = recentBoardsList.map(board => `
            <a href="#" onclick="openBoard('${board._id}')" class="nav-item">
                <i class="fas fa-layer-group"></i>
                ${escapeHtml(board.name)}
            </a>
        `).join('');
    }

    // Set up event listeners
    setupEventListeners() {
        // Create board form
        const createBoardForm = document.getElementById('createBoardForm');
        if (createBoardForm) {
            createBoardForm.addEventListener('submit', (e) => this.handleCreateBoard(e));
        }
    }

    // Handle create board
    async handleCreateBoard(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const boardData = {
            name: formData.get('name').trim(),
            description: formData.get('description').trim()
        };

        // Validate
        if (!boardData.name) {
            showError('Board name is required');
            return;
        }

        try {
            setLoading(submitBtn, true);
            
            const response = await api.createBoard(boardData);
            
            // Add new board to list
            this.boards.unshift(response.board);
            
            // Re-render dashboard
            this.renderDashboard();
            
            // Close modal
            closeModal('createBoardModal');
            
            // Reset form
            form.reset();
            
            showSuccess('Board created successfully!');
            
        } catch (error) {
            console.error('Create board error:', error);
            showError(error.message || 'Failed to create board');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // Add board to list (for real-time updates)
    addBoard(board) {
        this.boards.unshift(board);
        this.renderDashboard();
    }

    // Update board in list
    updateBoard(boardId, updates) {
        const index = this.boards.findIndex(b => b._id === boardId);
        if (index !== -1) {
            this.boards[index] = { ...this.boards[index], ...updates };
            this.renderDashboard();
        }
    }

    // Remove board from list
    removeBoard(boardId) {
        this.boards = this.boards.filter(b => b._id !== boardId);
        this.renderDashboard();
    }

    // Refresh dashboard data
    async refresh() {
        try {
            await this.loadDashboardData();
            this.renderDashboard();
        } catch (error) {
            console.error('Dashboard refresh error:', error);
            showError('Failed to refresh dashboard');
        }
    }

    // Reset dashboard state
    reset() {
        this.boards = [];
        this.stats = { myTickets: 0, inProgress: 0, completed: 0 };
    }

    // Show dashboard view
    show() {
        // Hide other views
        document.getElementById('boardView').style.display = 'none';
        
        // Show dashboard view
        document.getElementById('dashboardView').style.display = 'block';
        
        // Update navigation
        this.updateNavigation();
        
        // Refresh data
        this.refresh();
    }

    // Update navigation active state
    updateNavigation() {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to dashboard
        const dashboardNav = document.querySelector('.nav-item[onclick="showDashboard()"]');
        if (dashboardNav) {
            dashboardNav.classList.add('active');
        }
    }
}

// Create global dashboard manager instance
const dashboardManager = new DashboardManager();

// Global functions for HTML onclick handlers
function showDashboard() {
    dashboardManager.show();
}

function openBoard(boardId) {
    if (window.boardManager) {
        window.boardManager.openBoard(boardId);
    } else {
        console.error('Board manager not available');
    }
}

function openCreateBoardModal() {
    const modal = document.getElementById('createBoardModal');
    modal.style.display = 'block';
    modal.classList.add('show');
}

// Utility functions
function setLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = 'Loading...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

function showAllBoards() {
    // For now, just show dashboard - could be extended to show a boards-only view
    showDashboard();
}

// CSS for empty state
const emptyStateCSS = `
.empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-medium);
    grid-column: 1 / -1;
}

.empty-state i {
    font-size: 4rem;
    margin-bottom: 1rem;
    color: var(--text-light);
}

.empty-state h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: var(--text-dark);
}

.empty-state p {
    margin-bottom: 1.5rem;
}

.text-muted {
    color: var(--text-light);
    font-size: 0.875rem;
    text-align: center;
    padding: 1rem;
}
`;

// Add empty state CSS to document
if (!document.getElementById('empty-state-styles')) {
    const style = document.createElement('style');
    style.id = 'empty-state-styles';
    style.textContent = emptyStateCSS;
    document.head.appendChild(style);
}