const Payment = require('../models/Payment');
const Project = require('../models/Project');
const User = require('../models/User');
const FreelancerCompletionStat = require('../models/FreelancerCompletionStat');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const { createNotification } = require('../services/notificationService');

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

const finalizeCompletedPayment = async ({ app, payment, actorId }) => {
  if (!payment) return;
  await Promise.all([
    Project.findByIdAndUpdate(payment.projectId, { status: 'Completed' }),
    incrementCompletedJobsCounter(payment.freelancerId, payment.projectId),
    User.findByIdAndUpdate(payment.freelancerId, {
      $inc: { earnings: Number(payment.amount || 0) - Number(payment.platformFee || 0) }
    })
  ]);

  await createNotification(app, {
    recipientId: payment.freelancerId,
    actorId: actorId || payment.clientId,
    type: 'payment_success',
    title: 'Payment completed',
    message: 'Payment is done through net banking and has been credited successfully.',
    linkedEntityType: 'payment',
    linkedEntityId: String(payment._id),
    actionUrl: '/freelancer-earnings',
    metadata: {
      projectId: String(payment.projectId),
      paymentId: String(payment._id),
      amount: payment.amount,
      payoutMode: 'net_banking'
    }
  });
};

const buildRazorpayReceipt = (projectId) => {
  // Razorpay requires receipt length <= 40 chars.
  const compactProjectId = String(projectId || '').slice(-10);
  const compactTs = Date.now().toString().slice(-8);
  return `rcpt_${compactProjectId}_${compactTs}`;
};

const incrementCompletedJobsCounter = async (freelancerId, projectId) => {
  if (!freelancerId || !projectId) return;

  await FreelancerCompletionStat.updateOne(
    {
      freelancerId,
      completedProjectIds: { $ne: projectId }
    },
    {
      $inc: { completedJobsCount: 1 },
      $addToSet: { completedProjectIds: projectId }
    },
    {
      upsert: true
    }
  );
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
exports.getPayments = async (req, res) => {
  try {
    const { status, userId, role } = req.query;
    const authUserId = req.user?.id || req.user?._id;
    const authRole = req.user?.role;
    let query = {};

    // Always scope non-admin users to their own payments.
    if (authRole === 'client') {
      query.clientId = authUserId;
    } else if (authRole === 'freelancer') {
      query.freelancerId = authUserId;
    } else if (authRole === 'admin') {
      // Admin can optionally filter by user and role.
      if (userId && role === 'client') {
        query.clientId = userId;
      } else if (userId && role === 'freelancer') {
        query.freelancerId = userId;
      }
    } else if (userId && role) {
      // Fallback safety in case role is custom/legacy.
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
      await finalizeCompletedPayment({ app: req.app, payment, actorId: req.user.id });
    }
    
    res.json({ success: true, payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get completed jobs count for logged-in freelancer
// @route   GET /api/payments/completed-jobs/me
// @access  Private
exports.getMyCompletedJobsCount = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const completedProjectIdsFromPayments = await Payment.distinct('projectId', {
      freelancerId: userId,
      status: 'Completed'
    });
    const computedCount = completedProjectIdsFromPayments.length;

    let doc = await FreelancerCompletionStat.findOne({ freelancerId: userId })
      .select('completedJobsCount')
      .lean();

    if (!doc || Number(doc.completedJobsCount || 0) !== computedCount) {
      await FreelancerCompletionStat.findOneAndUpdate(
        { freelancerId: userId },
        {
          $set: {
            completedJobsCount: computedCount,
            completedProjectIds: completedProjectIdsFromPayments
          }
        },
        { upsert: true, new: true }
      );

      doc = { completedJobsCount: computedCount };
    }

    return res.json({
      success: true,
      completedJobsCount: Number(doc?.completedJobsCount || 0)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
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
        status: 'Reviewing',
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

    await Promise.all([
      createNotification(req.app, {
        recipientId: payment.freelancerId,
        actorId: payment.clientId,
        type: 'payment_success',
        title: 'Payment under review',
        message: `Payment for "${payment.projectTitle}" has been successfully received and is under review.`,
        linkedEntityType: 'payment',
        linkedEntityId: String(payment._id),
        actionUrl: '/my-projects',
        metadata: {
          projectId: String(projectId),
          paymentId: String(payment._id),
          amount: payment.amount
        }
      }),
      createNotification(req.app, {
        recipientId: payment.clientId,
        actorId: req.user.id,
        type: 'payment_success',
        title: 'Payment successful',
        message: `Your payment for "${payment.projectTitle}" is successful.`,
        linkedEntityType: 'payment',
        linkedEntityId: String(payment._id),
        actionUrl: '/client-payments',
        metadata: {
          projectId: String(projectId),
          paymentId: String(payment._id),
          amount: payment.amount
        }
      })
    ]);

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

