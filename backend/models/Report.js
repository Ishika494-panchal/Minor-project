const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reporterName: {
    type: String,
    required: true
  },
  reporterEmail: {
    type: String,
    required: true
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUserName: {
    type: String,
    required: true
  },
  reportedUserEmail: {
    type: String,
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  issueType: {
    type: String,
    enum: ['Fraud', 'Inappropriate Behavior', 'Payment Dispute', 'Harassment', 'Spam', 'Other'],
    required: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  evidence: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['Open', 'Under Review', 'Resolved'],
    default: 'Open'
  },
  resolution: {
    type: String,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
reportSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Report', reportSchema);

