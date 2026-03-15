const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    conversationType: {
      type: String,
      enum: ['project', 'order', 'support', 'dispute', 'direct'],
      default: 'project'
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null
    },
    orderId: {
      type: String,
      default: ''
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'disputed', 'archived', 'blocked'],
      default: 'active'
    },
    messagingAllowed: {
      type: Boolean,
      default: true
    },
    lastMessagePreview: {
      type: String,
      default: ''
    },
    lastMessageType: {
      type: String,
      enum: ['text', 'image', 'file', 'delivery_submission', 'revision_request', 'payment_update', 'system_notice'],
      default: 'text'
    },
    lastMessageAt: {
      type: Date,
      default: null
    },
    unreadCountClient: {
      type: Number,
      default: 0
    },
    unreadCountFreelancer: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

conversationSchema.index({ clientId: 1, updatedAt: -1 });
conversationSchema.index({ freelancerId: 1, updatedAt: -1 });
conversationSchema.index({ projectId: 1, conversationType: 1 });
conversationSchema.index({ orderId: 1, conversationType: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
