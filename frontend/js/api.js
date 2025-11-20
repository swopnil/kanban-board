const API_URL = 'http://localhost:5001/api';

const request = async (endpoint, options = {}) => {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(API_URL + endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` })
            },
            ...options
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Network error' }));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Cannot connect to server. Please ensure the server is running on port 5001.');
        }
        throw error;
    }
};

const api = {
    signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    signin: (data) => request('/auth/signin', { method: 'POST', body: JSON.stringify(data) }),
    getUser: () => request('/auth/me'),
    
    getBoards: () => request('/boards'),
    getBoard: (id) => request(`/boards/${id}`),
    createBoard: (data) => request('/boards', { method: 'POST', body: JSON.stringify(data) }),
    
    getTickets: (boardId) => request(`/tickets/board/${boardId}`),
    createTicket: (data) => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
    updateTicket: (id, data) => request(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTicket: (id) => request(`/tickets/${id}`, { method: 'DELETE' })
};