let currentBoard = null;
let boardTickets = [];

const board = {
    open: async (boardId) => {
        try {
            const boardRes = await api.getBoard(boardId);
            const ticketsRes = await api.getTickets(boardId);
            
            currentBoard = boardRes.board;
            boardTickets = ticketsRes.tickets || [];
            
            render();
            showBoard();
        } catch (error) {
            console.error('Board loading error:', error);
            alert(`Failed to load board: ${error.message || error}`);
        }
    },

    moveTicket: async (ticketId, newStatus) => {
        try {
            await api.updateTicket(ticketId, { status: newStatus });
            const ticket = boardTickets.find(t => t._id === ticketId);
            if (ticket) {
                ticket.status = newStatus;
                render();
            }
        } catch (error) {
            alert('Failed to move ticket');
        }
    }
};

const render = () => {
    const boardTitleEl = document.getElementById('boardTitle');
    if (boardTitleEl && currentBoard) {
        boardTitleEl.textContent = currentBoard.name;
    }
    
    // Map status to correct container IDs
    const statusMap = {
        'in process': 'inProgressTickets',
        'ready': 'readyTickets', 
        'completed': 'completedTickets'
    };
    
    ['in process', 'ready', 'completed'].forEach(status => {
        const statusTickets = boardTickets.filter(t => t.status === status);
        const containerId = statusMap[status];
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.warn(`Container not found for status: ${status}, ID: ${containerId}`);
            return;
        }
        
        if (statusTickets.length === 0) {
            container.innerHTML = '<p>No tickets</p>';
        } else {
            container.innerHTML = statusTickets.map(ticket => `
                <div class="ticket" onclick="viewTicket('${ticket._id}')">
                    <h4>${escapeHtml(ticket.title)}</h4>
                    <p>${escapeHtml(ticket.description)}</p>
                    ${ticket.assignedTo ? `<div>Assigned: ${escapeHtml(ticket.assignedTo.name)}</div>` : ''}
                </div>
            `).join('');
        }
        
        // Update ticket count
        const countEl = document.getElementById(containerId.replace('Tickets', 'TicketCount'));
        if (countEl) {
            countEl.textContent = statusTickets.length;
        }
    });
};

const showBoard = () => {
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('boardView').style.display = 'block';
};

const viewTicket = (ticketId) => {
    // Simple ticket view - can be expanded
    const ticket = boardTickets.find(t => t._id === ticketId);
    if (ticket) {
        alert(`${ticket.title}\n\n${ticket.description}`);
    }
};

// Board Manager class for compatibility
class BoardManager {
    openBoard(boardId) {
        board.open(boardId);
    }

    refresh() {
        if (currentBoard) {
            board.open(currentBoard._id);
        }
    }
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Create global board manager instance
const boardManager = new BoardManager();
window.boardManager = boardManager;