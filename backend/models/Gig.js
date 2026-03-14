const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Gig title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Gig description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  subcategory: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Price must be at least 1']
  },
  deliveryDays: {
    type: Number,
    required: [true, 'Delivery days is required'],
    min: [1, 'Delivery must be at least 1 day']
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
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['Active', 'Paused', 'Deleted'],
    default: 'Active'
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
gigSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Gig', gigSchema);

