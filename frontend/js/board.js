// Board Management
class BoardManager {
    constructor() {
        this.currentBoard = null;
        this.tickets = [];
        this.boardMembers = [];
        this.draggedTicket = null;
    }

    // Open board by ID
    async openBoard(boardId) {
        try {
            await this.loadBoard(boardId);
            await this.loadTickets();
            this.renderBoard();
            this.showBoardView();
            this.setupDragAndDrop();
        } catch (error) {
            console.error('Error opening board:', error);
            showError('Failed to load board');
        }
    }

    // Load board data
    async loadBoard(boardId) {
        try {
            const response = await api.getBoardById(boardId);
            this.currentBoard = response.board;
            this.boardMembers = [
                { user: response.board.owner, role: 'Owner' },
                ...response.board.members
            ];
        } catch (error) {
            console.error('Error loading board:', error);
            throw error;
        }
    }

    // Load tickets for current board
    async loadTickets() {
        if (!this.currentBoard) return;

        try {
            const response = await api.getTicketsByBoard(this.currentBoard._id);
            this.tickets = response.tickets || [];
        } catch (error) {
            console.error('Error loading tickets:', error);
            throw error;
        }
    }

    // Render board view
    renderBoard() {
        if (!this.currentBoard) return;

        // Update board header
        document.getElementById('boardTitle').textContent = this.currentBoard.name;
        document.getElementById('boardDescription').textContent = 
            this.currentBoard.description || 'No description';

        // Populate assignee dropdown in create ticket form
        this.populateAssigneeDropdown();

        // Render kanban columns
        this.renderKanbanBoard();
    }

    // Populate assignee dropdown with board members
    populateAssigneeDropdown() {
        const assigneeSelect = document.getElementById('ticketAssignee');
        if (!assigneeSelect) return;

        assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
        
        this.boardMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.user._id;
            option.textContent = `${member.user.name} (${member.role})`;
            assigneeSelect.appendChild(option);
        });
    }

    // Render kanban board with tickets
    renderKanbanBoard() {
        const columns = ['in process', 'ready', 'completed'];
        
        columns.forEach(status => {
            const tickets = this.tickets.filter(ticket => ticket.status === status);
            this.renderTicketColumn(status, tickets);
        });
    }

    // Render tickets in specific column
    renderTicketColumn(status, tickets) {
        const columnMap = {
            'in process': 'inProgress',
            'ready': 'ready',
            'completed': 'completed'
        };

        const columnKey = columnMap[status];
        const ticketList = document.getElementById(`${columnKey}Tickets`);
        const ticketCount = document.getElementById(`${columnKey}TicketCount`);

        if (!ticketList || !ticketCount) return;

        // Update count
        ticketCount.textContent = tickets.length;

        // Render tickets
        if (tickets.length === 0) {
            ticketList.innerHTML = `
                <div class="empty-column">
                    <p>No tickets in ${status}</p>
                </div>
            `;
        } else {
            ticketList.innerHTML = tickets.map(ticket => this.renderTicketCard(ticket)).join('');
        }
    }

    // Render individual ticket card
    renderTicketCard(ticket) {
        const priorityClass = `priority-${ticket.priority || 'medium'}`;
        const assignee = ticket.assignedTo;
        const dueDate = ticket.dueDate;
        
        let dueDateHtml = '';
        if (dueDate) {
            const dueDateText = formatDueDate(dueDate);
            const isOverdue = new Date(dueDate) < new Date();
            dueDateHtml = `<span class="due-date ${isOverdue ? 'overdue' : ''}">${dueDateText}</span>`;
        }

        let assigneeHtml = '';
        if (assignee) {
            const initials = getUserInitials(assignee.name);
            assigneeHtml = `
                <div class="ticket-assignee">
                    <div class="assignee-avatar">${initials}</div>
                    <span class="assignee-name">${escapeHtml(assignee.name)}</span>
                </div>
            `;
        }

        let tagsHtml = '';
        if (ticket.tags && ticket.tags.length > 0) {
            tagsHtml = `
                <div class="ticket-tags">
                    ${ticket.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            `;
        }

        let blockersHtml = '';
        if (ticket.blockers && ticket.blockers.length > 0) {
            blockersHtml = `<i class="fas fa-ban" title="${ticket.blockers.length} blocker(s)"></i>`;
        }

        return `
            <div class="ticket-card ${priorityClass}" 
                 draggable="true" 
                 data-ticket-id="${ticket._id}"
                 onclick="openTicketDetail('${ticket._id}')">
                <div class="ticket-header">
                    <span class="ticket-id">${escapeHtml(ticket.ticketId)}</span>
                    <div class="ticket-priority ${ticket.priority || 'medium'}">${ticket.priority || 'medium'}</div>
                </div>
                <h4 class="ticket-title">${escapeHtml(ticket.title)}</h4>
                <p class="ticket-description">${escapeHtml(ticket.description)}</p>
                <div class="ticket-footer">
                    <div class="ticket-meta">
                        ${assigneeHtml}
                        ${tagsHtml}
                    </div>
                    <div class="ticket-actions">
                        ${blockersHtml}
                        ${dueDateHtml}
                    </div>
                </div>
            </div>
        `;
    }

    // Setup drag and drop functionality
    setupDragAndDrop() {
        // Add drag event listeners to tickets
        this.addTicketDragListeners();
        
        // Add drop event listeners to columns
        this.addColumnDropListeners();
    }

    // Add drag event listeners to tickets
    addTicketDragListeners() {
        document.querySelectorAll('.ticket-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.draggedTicket = {
                    id: e.target.dataset.ticketId,
                    element: e.target
                };
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                this.draggedTicket = null;
                
                // Remove drag-over class from all columns
                document.querySelectorAll('.kanban-column').forEach(col => {
                    col.classList.remove('drag-over');
                });
            });
        });
    }

    // Add drop event listeners to columns
    addColumnDropListeners() {
        document.querySelectorAll('.kanban-column').forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', (e) => {
                // Only remove drag-over if we're leaving the column entirely
                if (!column.contains(e.relatedTarget)) {
                    column.classList.remove('drag-over');
                }
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                if (this.draggedTicket) {
                    const newStatus = column.dataset.status;
                    this.moveTicket(this.draggedTicket.id, newStatus);
                }
            });
        });
    }

    // Move ticket to new status
    async moveTicket(ticketId, newStatus) {
        try {
            // Find the ticket
            const ticket = this.tickets.find(t => t._id === ticketId);
            if (!ticket) {
                showError('Ticket not found');
                return;
            }

            // Don't update if status is the same
            if (ticket.status === newStatus) {
                return;
            }

            // Update ticket status
            await api.updateTicket(ticketId, { status: newStatus });

            // Update local ticket data
            ticket.status = newStatus;

            // Re-render kanban board
            this.renderKanbanBoard();
            this.setupDragAndDrop();

            showSuccess(`Ticket moved to ${newStatus}`);

        } catch (error) {
            console.error('Error moving ticket:', error);
            showError('Failed to move ticket');
            
            // Reload tickets to reset state
            await this.loadTickets();
            this.renderKanbanBoard();
            this.setupDragAndDrop();
        }
    }

    // Show board view
    showBoardView() {
        // Hide other views
        document.getElementById('dashboardView').style.display = 'none';
        
        // Show board view
        document.getElementById('boardView').style.display = 'block';
        
        // Update navigation
        this.updateNavigation();
    }

    // Update navigation active state
    updateNavigation() {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to boards nav
        const boardsNav = document.querySelector('.nav-item[onclick="showAllBoards()"]');
        if (boardsNav) {
            boardsNav.classList.add('active');
        }
    }

    // Add ticket to board (for real-time updates)
    addTicket(ticket) {
        this.tickets.unshift(ticket);
        this.renderKanbanBoard();
        this.setupDragAndDrop();
    }

    // Update ticket in board
    updateTicket(ticketId, updates) {
        const index = this.tickets.findIndex(t => t._id === ticketId);
        if (index !== -1) {
            this.tickets[index] = { ...this.tickets[index], ...updates };
            this.renderKanbanBoard();
            this.setupDragAndDrop();
        }
    }

    // Remove ticket from board
    removeTicket(ticketId) {
        this.tickets = this.tickets.filter(t => t._id !== ticketId);
        this.renderKanbanBoard();
        this.setupDragAndDrop();
    }

    // Refresh board data
    async refresh() {
        if (!this.currentBoard) return;
        
        try {
            await this.loadTickets();
            this.renderKanbanBoard();
            this.setupDragAndDrop();
        } catch (error) {
            console.error('Board refresh error:', error);
            showError('Failed to refresh board');
        }
    }

    // Get current board
    getCurrentBoard() {
        return this.currentBoard;
    }

    // Get board members
    getBoardMembers() {
        return this.boardMembers;
    }

    // Reset board state
    reset() {
        this.currentBoard = null;
        this.tickets = [];
        this.boardMembers = [];
        this.draggedTicket = null;
    }
}

// Create global board manager instance
const boardManager = new BoardManager();

// Global functions for HTML onclick handlers
function openTicketDetail(ticketId) {
    if (window.ticketManager) {
        window.ticketManager.openTicketDetail(ticketId);
    } else {
        console.error('Ticket manager not available');
    }
}

function openCreateTicketModal() {
    if (window.ticketManager) {
        window.ticketManager.openCreateModal();
    } else {
        console.error('Ticket manager not available');
    }
}

function openInviteModal() {
    const modal = document.getElementById('inviteModal');
    modal.classList.add('show');
}

// CSS for empty column and drag states
const boardCSS = `
.empty-column {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-light);
    font-style: italic;
}

.ticket-card {
    user-select: none;
    cursor: grab;
}

.ticket-card:active {
    cursor: grabbing;
}

.ticket-card.dragging {
    opacity: 0.5;
    transform: rotate(2deg) scale(0.95);
    box-shadow: 0 8px 16px rgba(9, 30, 66, 0.4);
}

.kanban-column.drag-over {
    background: #E3FCEF;
    border: 2px dashed var(--success-green);
    border-radius: var(--border-radius);
}

.kanban-column.drag-over .ticket-list {
    background: rgba(54, 179, 126, 0.1);
    border-radius: var(--border-radius);
}

.ticket-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.ticket-actions i {
    color: var(--error-red);
    font-size: 0.75rem;
}
`;

// Add board CSS to document
if (!document.getElementById('board-styles')) {
    const style = document.createElement('style');
    style.id = 'board-styles';
    style.textContent = boardCSS;
    document.head.appendChild(style);
}