// Ticket Management
class TicketManager {
    constructor() {
        this.currentTicket = null;
        this.isCreating = false;
        this.isEditing = false;
        this.availableTickets = []; // For blockers dropdown
    }

    // Initialize ticket manager
    init() {
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Create ticket form
        const createForm = document.getElementById('createTicketForm');
        if (createForm) {
            createForm.addEventListener('submit', (e) => this.handleCreateTicket(e));
        }

        // Invite form
        const inviteForm = document.getElementById('inviteForm');
        if (inviteForm) {
            inviteForm.addEventListener('submit', (e) => this.handleInviteUser(e));
        }
    }

    // Open create ticket modal
    openCreateModal() {
        const currentBoard = boardManager.getCurrentBoard();
        if (!currentBoard) {
            showError('No board selected');
            return;
        }

        this.isCreating = true;
        this.isEditing = false;
        
        // Reset form
        document.getElementById('createTicketForm').reset();
        
        // Set default due date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('ticketDueDate').value = tomorrow.toISOString().split('T')[0];
        
        // Show modal
        const modal = document.getElementById('createTicketModal');
        modal.classList.add('show');
    }

    // Open ticket detail modal
    async openTicketDetail(ticketId) {
        try {
            const response = await api.getTicketById(ticketId);
            this.currentTicket = response.ticket;
            
            await this.renderTicketDetail();
            
            const modal = document.getElementById('ticketDetailModal');
            modal.classList.add('show');
            
        } catch (error) {
            console.error('Error loading ticket detail:', error);
            showError('Failed to load ticket details');
        }
    }

    // Render ticket detail view
    async renderTicketDetail() {
        if (!this.currentTicket) return;

        const ticket = this.currentTicket;
        const content = document.querySelector('.ticket-detail-content');
        
        // Format dates
        const createdDate = formatDate(ticket.createdAt);
        const dueDate = ticket.dueDate ? formatDueDate(ticket.dueDate) : 'No due date';
        
        // Assignee info
        let assigneeHtml = 'Unassigned';
        if (ticket.assignedTo) {
            const initials = getUserInitials(ticket.assignedTo.name);
            assigneeHtml = `
                <div class="assignee-info">
                    <div class="assignee-avatar">${initials}</div>
                    <span>${escapeHtml(ticket.assignedTo.name)}</span>
                </div>
            `;
        }

        // Tags
        let tagsHtml = 'No tags';
        if (ticket.tags && ticket.tags.length > 0) {
            tagsHtml = ticket.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
        }

        // Blockers
        let blockersHtml = 'No blockers';
        if (ticket.blockers && ticket.blockers.length > 0) {
            blockersHtml = ticket.blockers.map(blocker => 
                `<div class="blocker-item">
                    <i class="fas fa-ban"></i>
                    <span>${escapeHtml(blocker.ticketId)} - ${escapeHtml(blocker.title)}</span>
                </div>`
            ).join('');
        }

        content.innerHTML = `
            <div class="ticket-detail-header">
                <div class="ticket-info">
                    <div class="ticket-id-large">${escapeHtml(ticket.ticketId)}</div>
                    <h3 class="ticket-title-large">${escapeHtml(ticket.title)}</h3>
                    <div class="ticket-meta-large">
                        <span class="created-by">Created by ${escapeHtml(ticket.createdBy.name)}</span>
                        <span class="created-date">${createdDate}</span>
                    </div>
                </div>
                <div class="ticket-actions">
                    <button class="btn btn-secondary" onclick="ticketManager.openEditTicket()">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="btn btn-danger" onclick="ticketManager.deleteTicket()">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
            
            <div class="ticket-detail-body">
                <div class="ticket-main-content">
                    <div class="description-section">
                        <h4>Description</h4>
                        <p class="description-text">${escapeHtml(ticket.description)}</p>
                    </div>
                    
                    <div class="comments-section">
                        <h4>Comments</h4>
                        <div class="comments-list" id="commentsList">
                            ${this.renderComments(ticket.comments || [])}
                        </div>
                        <div class="add-comment">
                            <textarea id="commentText" placeholder="Add a comment..." rows="3"></textarea>
                            <button class="btn btn-primary" onclick="ticketManager.addComment()">
                                <i class="fas fa-plus"></i>
                                Add Comment
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="ticket-sidebar">
                    <div class="detail-section">
                        <h5>Status</h5>
                        <div class="status-selector">
                            <select id="statusSelect" onchange="ticketManager.updateStatus()">
                                <option value="in process" ${ticket.status === 'in process' ? 'selected' : ''}>In Process</option>
                                <option value="ready" ${ticket.status === 'ready' ? 'selected' : ''}>Ready</option>
                                <option value="completed" ${ticket.status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Priority</h5>
                        <div class="priority-badge ${ticket.priority || 'medium'}">${ticket.priority || 'medium'}</div>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Assignee</h5>
                        ${assigneeHtml}
                    </div>
                    
                    <div class="detail-section">
                        <h5>Due Date</h5>
                        <div class="due-date ${ticket.dueDate && new Date(ticket.dueDate) < new Date() ? 'overdue' : ''}">${dueDate}</div>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Tags</h5>
                        <div class="tags-list">${tagsHtml}</div>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Blockers</h5>
                        <div class="blockers-list">${blockersHtml}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render comments list
    renderComments(comments) {
        if (!comments.length) {
            return '<p class="no-comments">No comments yet</p>';
        }

        return comments.map(comment => {
            const initials = getUserInitials(comment.user.name);
            const commentDate = formatDate(comment.createdAt);
            
            return `
                <div class="comment-item">
                    <div class="comment-header">
                        <div class="comment-author">
                            <div class="comment-avatar">${initials}</div>
                            <span class="author-name">${escapeHtml(comment.user.name)}</span>
                        </div>
                        <span class="comment-date">${commentDate}</span>
                    </div>
                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                </div>
            `;
        }).join('');
    }

    // Handle create ticket
    async handleCreateTicket(event) {
        event.preventDefault();
        
        const currentBoard = boardManager.getCurrentBoard();
        if (!currentBoard) {
            showError('No board selected');
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Parse tags
        const tagsInput = formData.get('tags');
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        const ticketData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            boardId: currentBoard._id,
            assignedTo: formData.get('assignedTo') || null,
            dueDate: formData.get('dueDate') || null,
            priority: formData.get('priority'),
            tags: tags
        };

        // Validate
        if (!ticketData.title || !ticketData.description) {
            showError('Title and description are required');
            return;
        }

        try {
            setLoading(submitBtn, true);
            
            const response = await api.createTicket(ticketData);
            
            // Add ticket to board
            boardManager.addTicket(response.ticket);
            
            // Close modal
            closeModal('createTicketModal');
            
            // Reset form
            form.reset();
            
            showSuccess('Ticket created successfully!');
            
        } catch (error) {
            console.error('Create ticket error:', error);
            showError(error.message || 'Failed to create ticket');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // Open edit ticket (convert detail modal to edit mode)
    openEditTicket() {
        if (!this.currentTicket) return;
        
        this.isEditing = true;
        
        // Close detail modal and open create modal with pre-filled data
        closeModal('ticketDetailModal');
        
        const form = document.getElementById('createTicketForm');
        document.getElementById('ticketTitle').value = this.currentTicket.title;
        document.getElementById('ticketDescription').value = this.currentTicket.description;
        document.getElementById('ticketPriority').value = this.currentTicket.priority || 'medium';
        
        if (this.currentTicket.assignedTo) {
            document.getElementById('ticketAssignee').value = this.currentTicket.assignedTo._id;
        }
        
        if (this.currentTicket.dueDate) {
            document.getElementById('ticketDueDate').value = new Date(this.currentTicket.dueDate).toISOString().split('T')[0];
        }
        
        if (this.currentTicket.tags) {
            document.getElementById('ticketTags').value = this.currentTicket.tags.join(', ');
        }
        
        // Change modal title and button text
        document.querySelector('#createTicketModal .modal-header h2').textContent = 'Edit Ticket';
        document.querySelector('#createTicketModal button[type="submit"]').textContent = 'Update Ticket';
        
        // Show modal
        document.getElementById('createTicketModal').classList.add('show');
    }

    // Update ticket status
    async updateStatus() {
        if (!this.currentTicket) return;
        
        const newStatus = document.getElementById('statusSelect').value;
        
        try {
            await api.updateTicket(this.currentTicket._id, { status: newStatus });
            
            // Update local data
            this.currentTicket.status = newStatus;
            
            // Update board
            boardManager.updateTicket(this.currentTicket._id, { status: newStatus });
            
            showSuccess('Status updated');
            
        } catch (error) {
            console.error('Error updating status:', error);
            showError('Failed to update status');
        }
    }

    // Add comment to ticket
    async addComment() {
        if (!this.currentTicket) return;
        
        const commentText = document.getElementById('commentText').value.trim();
        if (!commentText) {
            showError('Comment cannot be empty');
            return;
        }
        
        try {
            const response = await api.addCommentToTicket(this.currentTicket._id, commentText);
            
            // Add comment to current ticket
            if (!this.currentTicket.comments) {
                this.currentTicket.comments = [];
            }
            this.currentTicket.comments.push(response.comment);
            
            // Re-render comments
            const commentsList = document.getElementById('commentsList');
            commentsList.innerHTML = this.renderComments(this.currentTicket.comments);
            
            // Clear comment input
            document.getElementById('commentText').value = '';
            
            showSuccess('Comment added');
            
        } catch (error) {
            console.error('Error adding comment:', error);
            showError('Failed to add comment');
        }
    }

    // Delete ticket
    async deleteTicket() {
        if (!this.currentTicket) return;
        
        if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
            return;
        }
        
        try {
            await api.deleteTicket(this.currentTicket._id);
            
            // Remove from board
            boardManager.removeTicket(this.currentTicket._id);
            
            // Close modal
            closeModal('ticketDetailModal');
            
            showSuccess('Ticket deleted successfully');
            
        } catch (error) {
            console.error('Error deleting ticket:', error);
            showError('Failed to delete ticket');
        }
    }

    // Handle invite user
    async handleInviteUser(event) {
        event.preventDefault();
        
        const currentBoard = boardManager.getCurrentBoard();
        if (!currentBoard) {
            showError('No board selected');
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const email = formData.get('email').trim();
        
        if (!email) {
            showError('Email is required');
            return;
        }

        try {
            setLoading(submitBtn, true);
            
            await api.inviteUserToBoard(currentBoard._id, email);
            
            // Close modal
            closeModal('inviteModal');
            
            // Reset form
            form.reset();
            
            showSuccess('Invitation sent successfully!');
            
        } catch (error) {
            console.error('Invite error:', error);
            showError(error.message || 'Failed to send invitation');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // Reset ticket manager state
    reset() {
        this.currentTicket = null;
        this.isCreating = false;
        this.isEditing = false;
    }
}

// Create global ticket manager instance
const ticketManager = new TicketManager();

// CSS for ticket detail modal
const ticketDetailCSS = `
.ticket-detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.ticket-id-large {
    font-size: 0.875rem;
    color: var(--text-light);
    font-weight: 500;
    margin-bottom: 0.5rem;
}

.ticket-title-large {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--text-dark);
}

.ticket-meta-large {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--text-medium);
}

.ticket-detail-body {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
    padding: 1.5rem;
}

.description-section {
    margin-bottom: 2rem;
}

.description-section h4,
.comments-section h4 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--text-dark);
}

.description-text {
    color: var(--text-medium);
    line-height: 1.6;
    white-space: pre-wrap;
}

.comments-list {
    margin-bottom: 1.5rem;
}

.comment-item {
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    margin-bottom: 1rem;
}

.comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.comment-author {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.comment-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--primary-blue);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 600;
}

.author-name {
    font-weight: 500;
    font-size: 0.875rem;
}

.comment-date {
    font-size: 0.75rem;
    color: var(--text-light);
}

.comment-text {
    color: var(--text-medium);
    line-height: 1.5;
    white-space: pre-wrap;
}

.no-comments {
    text-align: center;
    color: var(--text-light);
    font-style: italic;
    padding: 2rem;
}

.add-comment textarea {
    width: 100%;
    margin-bottom: 1rem;
    resize: vertical;
}

.ticket-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.detail-section h5 {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--text-dark);
}

.status-selector select {
    width: 100%;
}

.priority-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    display: inline-block;
}

.assignee-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.blocker-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--secondary-gray);
    border-radius: var(--border-radius);
    margin-bottom: 0.5rem;
}

.blocker-item i {
    color: var(--error-red);
}

@media (max-width: 768px) {
    .ticket-detail-body {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    
    .ticket-detail-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }
    
    .ticket-actions {
        display: flex;
        gap: 1rem;
    }
}
`;

// Add ticket detail CSS to document
if (!document.getElementById('ticket-detail-styles')) {
    const style = document.createElement('style');
    style.id = 'ticket-detail-styles';
    style.textContent = ticketDetailCSS;
    document.head.appendChild(style);
}