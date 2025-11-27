const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telefono: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false // No incluir por defecto en consultas, usar .select('+password') cuando se necesite
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: null
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'es'
    }
  },
  subscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  },
  subscriptions: [{
    subscription: {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String
      }
    },
    type: {
      type: String,
      default: 'default'
    },
    config: {
      title: String,
      icon: String,
      badge: String,
      requireInteraction: Boolean,
      vibrate: [Number],
      sound: Boolean
    },
    active: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastActive: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices para mejorar rendimiento
userSchema.index({ telefono: 1 });
userSchema.index({ email: 1 });
userSchema.index({ lastActive: -1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ isAdmin: 1 });

module.exports = mongoose.model('User', userSchema);

