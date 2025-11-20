const express = require('express');
const Ticket = require('../models/Ticket');
const Board = require('../models/Board');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, async (req, res) => {
    try {
        const { title, description, boardId, assignedTo, priority } = req.body;

        const board = await Board.findOne({ _id: boardId, owner: req.user._id });
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        const ticket = new Ticket({
            title,
            description,
            createdBy: req.user._id,
            assignedTo: assignedTo || null,
            board: boardId,
            priority: priority || 'medium'
        });

        await ticket.save();
        await ticket.populate('createdBy assignedTo', 'name email');

        res.status(201).json({ ticket });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/board/:boardId', auth, async (req, res) => {
    try {
        const board = await Board.findOne({ _id: req.params.boardId, owner: req.user._id });
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        const tickets = await Ticket.find({ board: req.params.boardId })
            .populate('createdBy assignedTo', 'name email')
            .sort({ createdAt: -1 });

        res.json({ tickets });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/:ticketId', auth, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.ticketId)
            .populate('createdBy assignedTo', 'name email')
            .populate('board', 'name');

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const board = await Board.findOne({ _id: ticket.board._id, owner: req.user._id });
        if (!board) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({ ticket });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/:ticketId', auth, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.ticketId);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const board = await Board.findOne({ _id: ticket.board, owner: req.user._id });
        if (!board) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updates = req.body;
        Object.keys(updates).forEach(key => {
            ticket[key] = updates[key];
        });

        await ticket.save();
        await ticket.populate('createdBy assignedTo', 'name email');

        res.json({ ticket });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/:ticketId', auth, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.ticketId);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const board = await Board.findOne({ _id: ticket.board, owner: req.user._id });
        if (!board) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Ticket.findByIdAndDelete(req.params.ticketId);
        res.json({ message: 'Ticket deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;