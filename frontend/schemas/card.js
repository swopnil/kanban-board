const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
    title: String,
    description: String,
    status: { type: String, enum: ["To Do", "In Progress", "Completed"] },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Card', CardSchema);
