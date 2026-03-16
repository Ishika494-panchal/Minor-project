const mongoose = require('mongoose');

const adminActivitySchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actionType: {
      type: String,
      required: true,
      trim: true
    },
    targetType: {
      type: String,
      enum: ['user', 'service', 'order', 'payment', 'system'],
      required: true
    },
    targetId: {
      type: String,
      default: ''
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

adminActivitySchema.index({ createdAt: -1 });
adminActivitySchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminActivity', adminActivitySchema);
