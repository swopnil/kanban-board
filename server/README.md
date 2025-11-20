# Kanban Board Backend

A RESTful API for a Jira-like kanban board built with Express.js, MongoDB, and Mongoose.

## Features

- User authentication (signup/signin) with JWT
- Board creation and management
- Email-based board invitations
- Ticket CRUD operations with:
  - Auto-generated ticket IDs
  - Status tracking (in process, ready, completed)
  - Assignment to board members
  - Due dates
  - Blockers (references to other tickets)
  - Comments system
  - Priority levels
- Role-based access control (Person/Admin)
- Board membership validation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

3. Start the server:
```bash
npm start
# or for development
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login user
- `GET /api/auth/me` - Get current user info

### Boards
- `POST /api/boards` - Create new board
- `GET /api/boards` - Get user's boards
- `GET /api/boards/:boardId` - Get specific board
- `POST /api/boards/:boardId/invite` - Invite user to board
- `POST /api/boards/:boardId/accept-invitation` - Accept board invitation

### Tickets
- `POST /api/tickets` - Create new ticket
- `GET /api/tickets/board/:boardId` - Get board tickets
- `GET /api/tickets/:ticketId` - Get specific ticket
- `PUT /api/tickets/:ticketId` - Update ticket
- `DELETE /api/tickets/:ticketId` - Delete ticket
- `POST /api/tickets/:ticketId/comments` - Add comment to ticket

## Models

### User
- Email, password, name, role (Person/Admin)
- Associated boards

### Board
- Name, description, owner
- Members with roles
- Invitation system

### Ticket
- Auto-generated ticket ID
- Title, description
- Creator and assignee
- Status, priority, due date
- Blockers and comments
- Board association