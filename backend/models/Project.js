const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Web Development',
      'Mobile Development',
      'UI/UX Design',
      'Graphic Design',
      'Content Writing',
      'Digital Marketing',
      'Video Editing',
      'Data Entry',
      'Virtual Assistant',
      'Other'
    ]
  },
  skills: [{
    type: String,
    trim: true
  }],
  budget: {
    type: Number,
    required: [true, 'Budget is required'],
    min: [1, 'Budget must be at least 1']
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  experienceLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Expert'],
    required: [true, 'Experience level is required']
  },
  projectType: {
    type: String,
    enum: ['Fixed Price', 'Hourly'],
    default: 'Fixed Price'
  },
  attachments: [{
    type: String
  }],
  allowProposals: {
    type: Boolean,
    default: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Submitted', 'Completed', 'Cancelled'],
    default: 'Open'
  },
  assignedFreelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedFreelancerName: {
    type: String,
    default: null
  },
  submissionCodeFileName: {
    type: String,
    default: ''
  },
  submissionCodeFilePath: {
    type: String,
    default: ''
  },
  submissionHostedLink: {
    type: String,
    default: ''
  },
  submissionUploadedAt: {
    type: Date,
    default: null
  },
  clientApprovedForPayment: {
    type: Boolean,
    default: false
  },
  clientApprovedAt: {
    type: Date,
    default: null
  },
  resubmissionReason: {
    type: String,
    default: ''
  },
  resubmissionRequestedAt: {
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

// Speed up client project listing queries.
projectSchema.index({ clientId: 1, createdAt: -1 });
projectSchema.index({ assignedFreelancerId: 1, createdAt: -1 });
projectSchema.index({ status: 1, createdAt: -1 });

// Update timestamp on save
projectSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Project', projectSchema);

