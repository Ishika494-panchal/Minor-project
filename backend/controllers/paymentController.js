const Payment = require('../models/Payment');
const Project = require('../models/Project');
const User = require('../models/User');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');

const resolveFreelancerName = async (project) => {
  if (project?.assignedFreelancerName && String(project.assignedFreelancerName).trim()) {
    return String(project.assignedFreelancerName).trim();
  }

  if (project?.assignedFreelancerId) {
    const freelancer = await User.findById(project.assignedFreelancerId).select('fullName').lean();
    if (freelancer?.fullName && String(freelancer.fullName).trim()) {
      return String(freelancer.fullName).trim();
    }
  }

  return 'Freelancer';
};

const buildRazorpayReceipt = (projectId) => {
  // Razorpay requires receipt length <= 40 chars.
  const compactProjectId = String(projectId || '').slice(-10);
  const compactTs = Date.now().toString().slice(-8);
  return `rcpt_${compactProjectId}_${compactTs}`;
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
exports.getPayments = async (req, res) => {
  try {
    const { status, userId, role } = req.query;
    
    let query = {};
    
    if (userId) {
      if (role === 'client') {
        query.clientId = userId;
      } else if (role === 'freelancer') {
        query.freelancerId = userId;
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    const payments = await Payment.find(query)
      .populate('clientId', 'fullName email')
      .populate('freelancerId', 'fullName email')
      .populate('projectId', 'title')
      .sort({ paymentDate: -1 });
    
    res.json({ success: true, payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('clientId', 'fullName email')
      .populate('freelancerId', 'fullName email')
      .populate('projectId', 'title');
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    res.json({ success: true, payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create payment
// @route   POST /api/payments
// @access  Private
exports.createPayment = async (req, res) => {
  try {
    const { projectId, amount, paymentMethod } = req.body;
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Calculate platform fee (10%)
    const platformFee = amount * 0.1;
    
    const freelancerName = await resolveFreelancerName(project);

    const payment = await Payment.create({
      projectId,
      projectTitle: project.title,
      clientId: project.clientId,
      freelancerId: project.assignedFreelancerId,
      freelancerName,
      amount,
      platformFee,
      paymentMethod,
      status: 'Pending'
    });
    
    res.status(201).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id/status
// @access  Private
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    // If completed, update project status
    if (status === 'Completed') {
      await Project.findByIdAndUpdate(payment.projectId, {
        status: 'Completed'
      });
    }
    
    res.json({ success: true, payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get payment summary
// @route   GET /api/payments/summary/:userId
// @access  Private
exports.getPaymentSummary = async (req, res) => {
  try {
    const { role } = req.query;
    const userId = req.params.userId;
    
    let query = {};
    if (role === 'client') {
      query.clientId = userId;
    } else if (role === 'freelancer') {
      query.freelancerId = userId;
    }
    
    const payments = await Payment.find(query);
    
    const completedPayments = payments.filter(p => p.status === 'Completed');
    const pendingPayments = payments.filter(p => p.status === 'Pending');
    
    const totalAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalEarnings = completedPayments.reduce((sum, p) => sum + (p.amount - p.platformFee), 0);
    
    res.json({
      success: true,
      summary: {
        totalPayments: payments.length,
        completedPayments: completedPayments.length,
        pendingPayments: pendingPayments.length,
        totalAmount,
        totalEarnings
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { projectId, amount } = req.body;
    const userId = req.user?.id || req.user?._id;

    // Validate input
    if (!projectId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and amount are required'
      });
    }

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!userId || String(project.clientId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to pay for this project'
      });
    }

    if (!project.assignedFreelancerId) {
      return res.status(400).json({
        success: false,
        message: 'Project does not have an assigned freelancer'
      });
    }

    if (project.status !== 'Submitted') {
      return res.status(400).json({
        success: false,
        message: 'Payment can only be made after freelancer submits work'
      });
    }

    const freelancerName = await resolveFreelancerName(project);

    if (Number(amount) !== Number(project.budget)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount for this project'
      });
    }

    const existingCompletedPayment = await Payment.findOne({
      projectId,
      status: 'Completed'
    }).lean();
    if (existingCompletedPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment for this project is already completed'
      });
    }

    // Calculate platform fee (10%)
    const platformFee = Math.round(amount * 0.1);
    const amountInPaise = Math.round(amount * 100); // Razorpay expects amount in paise

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: buildRazorpayReceipt(projectId),
      notes: {
        projectId: projectId.toString(),
        clientId: project.clientId.toString(),
        freelancerId: project.assignedFreelancerId.toString()
      }
    });

    // Create payment record in database
    const payment = await Payment.create({
      projectId,
      projectTitle: project.title,
      clientId: project.clientId,
      freelancerId: project.assignedFreelancerId,
      freelancerName,
      amount,
      platformFee,
      paymentMethod: 'Razorpay',
      status: 'Pending',
      razorpayOrderId: razorpayOrder.id
    });

    res.status(201).json({
      success: true,
      order: razorpayOrder,
      paymentId: payment._id,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_SQND7PBjAsvi8S'
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: error?.error?.description || error.message || 'Failed to create payment order'
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      projectId,
      paymentId
    } = req.body;

    // Validate input
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'All payment details are required'
      });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'Q803t63cTRAN6p2MtuSifVOV')
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      // Update payment status to Failed
      if (paymentId) {
        await Payment.findByIdAndUpdate(paymentId, {
          status: 'Failed',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: 'Completed',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentDate: Date.now()
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Update project status to In Progress
    await Project.findByIdAndUpdate(projectId, {
      status: 'In Progress'
    });

    // Update freelancer earnings
    const freelancerEarnings = payment.amount - payment.platformFee;
    await User.findByIdAndUpdate(payment.freelancerId, {
      $inc: { earnings: freelancerEarnings }
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: payment
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};

// @desc    Get Razorpay key
// @route   GET /api/payments/key
// @access  Public
exports.getRazorpayKey = async (req, res) => {
  try {
    res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_SQND7PBjAsvi8S'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

