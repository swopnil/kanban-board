const express = require('express');
const { body, validationResult } = require('express-validator');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { authenticateToken, checkBoardMembership } = require('../middleware/auth');

const router = express.Router();

router.post('/', [
  authenticateToken,
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('boardId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, boardId, assignedTo, dueDate, priority, tags } = req.body;

    req.params.boardId = boardId;
    const board = await checkBoardMembership(req, res, () => {});
    if (!req.board) return;

    let assignedUser = null;
    if (assignedTo) {
      assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(400).json({ message: 'Assigned user not found' });
      }

      const isAssignedUserMember = req.board.members.some(
        member => member.user.toString() === assignedTo
      ) || req.board.owner.toString() === assignedTo;

      if (!isAssignedUserMember) {
        return res.status(400).json({ message: 'Assigned user is not a board member' });
      }
    }

    const ticket = new Ticket({
      title,
      description,
      createdBy: req.user._id,
      assignedTo: assignedTo || null,
      board: boardId,
      dueDate: dueDate || null,
      priority: priority || 'medium',
      tags: tags || []
    });

    await ticket.save();

    await ticket.populate('createdBy', 'name email');
    await ticket.populate('assignedTo', 'name email');
    await ticket.populate('board', 'name');

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/board/:boardId', authenticateToken, checkBoardMembership, async (req, res) => {
  try {
    const { status, assignedTo, createdBy } = req.query;
    
    let filter = { board: req.params.boardId };
    
    if (status) {
      filter.status = status;
    }
    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }
    if (createdBy) {
      filter.createdBy = createdBy;
    }

    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('blockers', 'ticketId title')
      .sort({ createdAt: -1 });

    res.json({ tickets });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:ticketId', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('board', 'name')
      .populate('blockers', 'ticketId title status')
      .populate('comments.user', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    req.params.boardId = ticket.board._id;
    await checkBoardMembership(req, res, () => {});
    if (!req.board) return;

    res.json({ ticket });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:ticketId', [
  authenticateToken,
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    req.params.boardId = ticket.board;
    await checkBoardMembership(req, res, () => {});
    if (!req.board) return;

    const { title, description, assignedTo, status, dueDate, priority, tags, blockers } = req.body;

    if (assignedTo !== undefined) {
      if (assignedTo) {
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
          return res.status(400).json({ message: 'Assigned user not found' });
        }

        const isAssignedUserMember = req.board.members.some(
          member => member.user.toString() === assignedTo
        ) || req.board.owner.toString() === assignedTo;

        if (!isAssignedUserMember) {
          return res.status(400).json({ message: 'Assigned user is not a board member' });
        }
      }
      ticket.assignedTo = assignedTo;
    }

    if (title !== undefined) ticket.title = title;
    if (description !== undefined) ticket.description = description;
    if (status !== undefined) ticket.status = status;
    if (dueDate !== undefined) ticket.dueDate = dueDate;
    if (priority !== undefined) ticket.priority = priority;
    if (tags !== undefined) ticket.tags = tags;
    if (blockers !== undefined) ticket.blockers = blockers;

    await ticket.save();

    await ticket.populate('createdBy', 'name email');
    await ticket.populate('assignedTo', 'name email');
    await ticket.populate('blockers', 'ticketId title');

    res.json({
      message: 'Ticket updated successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:ticketId/comments', [
  authenticateToken,
  body('text').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    req.params.boardId = ticket.board;
    await checkBoardMembership(req, res, () => {});
    if (!req.board) return;

    const { text } = req.body;

    ticket.comments.push({
      user: req.user._id,
      text
    });

    await ticket.save();

    await ticket.populate('comments.user', 'name email');

    res.json({
      message: 'Comment added successfully',
      comment: ticket.comments[ticket.comments.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:ticketId', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    req.params.boardId = ticket.board;
    await checkBoardMembership(req, res, () => {});
    if (!req.board) return;

    if (ticket.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Only ticket creator or admin can delete.' });
    }

    await Ticket.findByIdAndDelete(req.params.ticketId);

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;