const mongoose = require('mongoose');

const freelancerCompletionStatSchema = new mongoose.Schema(
  {
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    completedJobsCount: {
      type: Number,
      default: 0
    },
    completedProjectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
      }
    ]
  },
  { timestamps: true }
);

freelancerCompletionStatSchema.index({ freelancerId: 1 }, { unique: true });

module.exports = mongoose.model('FreelancerCompletionStat', freelancerCompletionStatSchema);
