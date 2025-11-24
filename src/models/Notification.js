const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification Type
  type: {
    type: String,
    required: true,
    enum: [
      'file_upload',
      'task_assigned',
      'task_due',
      'task_overdue',
      'alarm',
      'visit_status',
      'medicine_reminder',
      'care_plan_update',
      'system_alert',
      'other'
    ],
    index: true
  },

  // Content
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },

  // Priority
  priority: {
    type: String,
    required: true,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },

  // Recipient
  recipientId: {
    type: String,
    required: true,
    index: true
  },
  recipientType: {
    type: String,
    enum: ['staff', 'patient', 'admin', 'system'],
    default: 'staff'
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
    index: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },

  // Delivery Channels
  channels: {
    push: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      messageId: { type: String, default: null }
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      messageId: { type: String, default: null }
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      messageId: { type: String, default: null }
    },
    inApp: {
      displayed: { type: Boolean, default: false },
      displayedAt: { type: Date, default: null }
    }
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Related Entities
  relatedEntities: {
    visitId: {
      type: String,
      index: true,
      default: null
    },
    patientId: {
      type: String,
      index: true,
      default: null
    },
    taskId: {
      type: String,
      index: true,
      default: null
    },
    carePlanId: {
      type: String,
      index: true,
      default: null
    },
    fileId: {
      type: String,
      default: null
    }
  },

  // Action
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String,
    default: null
  },
  actionLabel: {
    type: String,
    default: null
  },
  actionCompleted: {
    type: Boolean,
    default: false
  },
  actionCompletedAt: {
    type: Date,
    default: null
  },

  // Expiration
  expiresAt: {
    type: Date,
    default: null
  },

  // AWS SNS/SQS Integration
  snsMessageId: {
    type: String,
    default: null
  },
  sqsMessageId: {
    type: String,
    default: null
  },

  // Audit
  createdBy: {
    type: String,
    default: 'system'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, priority: 1, read: 1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for age in minutes
notificationSchema.virtual('ageMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / 60000);
});

// Virtual for is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for is urgent
notificationSchema.virtual('isUrgent').get(function() {
  return this.priority === 'urgent' || this.priority === 'high';
});

// Pre-save middleware to update updatedAt
notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  this.status = 'read';
  return this.save();
};

// Instance method to mark action as completed
notificationSchema.methods.completeAction = function() {
  this.actionCompleted = true;
  this.actionCompletedAt = new Date();
  return this.save();
};

// Instance method to mark as delivered
notificationSchema.methods.markAsDelivered = function(channel, messageId) {
  if (this.channels[channel]) {
    this.channels[channel].sent = true;
    this.channels[channel].sentAt = new Date();
    this.channels[channel].messageId = messageId;
  }
  
  if (this.status === 'pending') {
    this.status = 'sent';
  }
  
  return this.save();
};

// Static method to find unread notifications
notificationSchema.statics.findUnread = function(recipientId) {
  return this.find({
    recipientId,
    read: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ priority: -1, createdAt: -1 });
};

// Static method to find by recipient
notificationSchema.statics.findByRecipient = function(recipientId, options = {}) {
  const query = { recipientId };
  
  if (options.type) {
    query.type = options.type;
  }
  
  if (options.read !== undefined) {
    query.read = options.read;
  }
  
  if (options.priority) {
    query.priority = options.priority;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(recipientId) {
  return this.countDocuments({
    recipientId,
    read: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(recipientId) {
  return this.updateMany(
    { recipientId, read: false },
    { 
      $set: { 
        read: true, 
        readAt: new Date(),
        status: 'read'
      } 
    }
  );
};

// Static method to delete old notifications
notificationSchema.statics.deleteOld = function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    read: true
  });
};

// Static method to get statistics
notificationSchema.statics.getStats = function(recipientId) {
  return this.aggregate([
    { $match: { recipientId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: {
          $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
        },
        byType: {
          $push: {
            type: '$type',
            count: 1
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            count: 1
          }
        }
      }
    }
  ]);
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
