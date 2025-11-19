const mongoose = require('mongoose');

const BoardSchema = new mongoose.Schema({
    name: String,
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    columns: {
        type: [String],
        default: ["To Do", "In Progress", "Completed"]
    }
});

module.exports = mongoose.model('Board', BoardSchema);
