const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    type: {
      type: String,
      enum: [
        'chat_message',
        'order_created',
        'order_accepted',
        'order_cancelled',
        'delivery_submitted',
        'revision_requested',
        'project_approved',
        'payment_success',
        'payout_sent',
        'dispute_opened',
        'system_alert'
      ],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    linkedEntityType: {
      type: String,
      enum: ['message', 'conversation', 'project', 'payment', 'proposal', 'dispute', 'system'],
      default: 'system'
    },
    linkedEntityId: {
      type: String,
      default: ''
    },
    actionUrl: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
