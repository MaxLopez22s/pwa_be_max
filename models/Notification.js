const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    default: '/icons/icon-192x192.png'
  },
  badge: {
    type: String,
    default: '/icons/badge-72x72.png'
  },
  url: {
    type: String,
    default: '/'
  },
  type: {
    type: String,
<<<<<<< HEAD
    // Permitir tipos de suscripción (default, alerts, messages, updates, promotions) 
    // y tipos tradicionales (info, success, warning, error, reminder)
=======
    enum: ['info', 'success', 'warning', 'error', 'reminder'],
>>>>>>> 4e4798affbbce5a97f74cdf8d52f7ae1f869372d
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  read: {
    type: Boolean,
    default: false
  },
  sent: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices para mejorar rendimiento
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ sent: 1, sentAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
