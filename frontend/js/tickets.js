const tickets = {
    create: async (title, description, boardId, assignedTo, priority) => {
        try {
            const response = await api.createTicket({
                title,
                description,
                boardId,
                assignedTo,
                priority: priority || 'medium'
            });
            return response.ticket;
        } catch (error) {
            alert('Failed to create ticket');
            throw error;
        }
    },

    update: async (ticketId, updates) => {
        try {
            await api.updateTicket(ticketId, updates);
        } catch (error) {
            alert('Failed to update ticket');
            throw error;
        }
    },

    delete: async (ticketId) => {
        try {
            await api.deleteTicket(ticketId);
        } catch (error) {
            alert('Failed to delete ticket');
            throw error;
        }
    }
};