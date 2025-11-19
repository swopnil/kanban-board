const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  status: {
    type: String,
    enum: ['in process', 'ready', 'completed'],
    default: 'in process'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  blockers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketId) {
    const count = await mongoose.model('Ticket').countDocuments({ board: this.board });
    this.ticketId = `TICKET-${count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);