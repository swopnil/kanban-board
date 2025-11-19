const express = require('express');
const { body, validationResult } = require('express-validator');
const Board = require('../models/Board');
const User = require('../models/User');
const { authenticateToken, checkBoardMembership } = require('../middleware/auth');

const router = express.Router();

router.post('/', [
  authenticateToken,
  body('name').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    const board = new Board({
      name,
      description,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'Admin'
      }]
    });

    await board.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: { boards: board._id }
    });

    await board.populate('owner', 'name email');
    await board.populate('members.user', 'name email');

    res.status(201).json({
      message: 'Board created successfully',
      board
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort({ createdAt: -1 });

    res.json({ boards });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:boardId', authenticateToken, checkBoardMembership, async (req, res) => {
  try {
    await req.board.populate('owner', 'name email');
    await req.board.populate('members.user', 'name email');
    await req.board.populate('invitations.invitedBy', 'name email');

    res.json({ board: req.board });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:boardId/invite', [
  authenticateToken,
  checkBoardMembership,
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const board = req.board;

    const existingInvitation = board.invitations.find(
      inv => inv.email === email && inv.status === 'pending'
    );

    if (existingInvitation) {
      return res.status(400).json({ message: 'Invitation already sent' });
    }

    const existingMember = board.members.find(member => 
      member.user.email === email
    );

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    board.invitations.push({
      email,
      invitedBy: req.user._id,
      status: 'pending'
    });

    await board.save();

    res.json({
      message: 'Invitation sent successfully',
      invitation: board.invitations[board.invitations.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:boardId/accept-invitation', [
  authenticateToken,
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const boardId = req.params.boardId;

    if (req.user.email !== email) {
      return res.status(403).json({ message: 'Cannot accept invitation for different email' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const invitation = board.invitations.find(
      inv => inv.email === email && inv.status === 'pending'
    );

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found or already processed' });
    }

    board.members.push({
      user: req.user._id,
      role: 'Member'
    });

    invitation.status = 'accepted';

    await board.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: { boards: board._id }
    });

    res.json({
      message: 'Invitation accepted successfully',
      board: board._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;