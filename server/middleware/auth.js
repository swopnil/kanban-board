const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const checkBoardMembership = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.body.boardId;
    const userId = req.user._id;

    const Board = require('../models/Board');
    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const isMember = board.members.some(member => member.user.toString() === userId.toString()) || 
                    board.owner.toString() === userId.toString();

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. Not a board member.' });
    }

    req.board = board;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const checkAdminRole = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

module.exports = {
  authenticateToken,
  checkBoardMembership,
  checkAdminRole
};