const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['task', 'note', 'reminder', 'bookmark', 'file', 'other']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  dueDate: {
    type: Date,
    default: null
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Índices para mejorar rendimiento
dataSchema.index({ user: 1, type: 1 });
dataSchema.index({ user: 1, isArchived: 1 });
dataSchema.index({ user: 1, completed: 1 });
dataSchema.index({ user: 1, createdAt: -1 });
dataSchema.index({ tags: 1 });
dataSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Data', dataSchema);
