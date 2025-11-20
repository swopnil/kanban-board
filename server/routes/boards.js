const express = require('express');
const Board = require('../models/Board');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        const board = new Board({
            name,
            description,
            owner: req.user._id
        });

        await board.save();
        await board.populate('owner', 'name email');

        res.status(201).json({ board });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const boards = await Board.find({ owner: req.user._id })
            .populate('owner', 'name email')
            .sort({ createdAt: -1 });

        res.json({ boards });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/:boardId', auth, async (req, res) => {
    try {
        const board = await Board.findOne({
            _id: req.params.boardId,
            owner: req.user._id
        }).populate('owner', 'name email');

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        res.json({ board });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;