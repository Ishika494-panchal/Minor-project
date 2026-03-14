const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  projectTitle: {
    type: String,
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  clientName: {
    type: String,
    default: ''
  },
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancerName: {
    type: String,
    required: true
  },
  freelancerProfilePicture: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  proposedBudget: {
    type: Number,
    required: [true, 'Proposed budget is required'],
    min: [1, 'Budget must be at least 1']
  },
  deliveryTime: {
    type: Number,
    required: [true, 'Delivery time is required'],
    min: [1, 'Delivery time must be at least 1 day']
  },
  proposalMessage: {
    type: String,
    required: [true, 'Proposal message is required'],
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  portfolioLink: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
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

// Speed up proposal listing for client and project views.
proposalSchema.index({ clientId: 1, createdAt: -1 });
proposalSchema.index({ projectId: 1, createdAt: -1 });
proposalSchema.index({ freelancerId: 1, createdAt: -1 });

// Update timestamp on save
proposalSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Proposal', proposalSchema);

