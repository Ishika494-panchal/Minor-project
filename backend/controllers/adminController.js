const User = require('../models/User');
const Project = require('../models/Project');
const Gig = require('../models/Gig');
const Proposal = require('../models/Proposal');
const Payment = require('../models/Payment');
const AdminActivity = require('../models/AdminActivity');
const { createNotification } = require('../services/notificationService');

const toAdminUser = (user) => ({
  id: String(user._id),
  fullName: user.fullName || '',
  email: user.email || '',
  role: user.role || 'client',
  accountStatus: user.accountStatus || 'Active',
  skills: Array.isArray(user.skills) ? user.skills : [],
  bio: user.bio || '',
  hourlyRate: Number(user.hourlyRate || 0),
  profileImage: user.profileImage || '',
  earnings: Number(user.earnings || 0),
  createdAt: user.createdAt
});

const toAdminService = (gig) => ({
  id: String(gig._id),
  title: gig.title || '',
  category: gig.category || '',
  freelancerId: String(gig.freelancerId || ''),
  freelancerName: gig.freelancerName || 'Freelancer',
  price: Number(gig.price || 0),
  deliveryDays: Number(gig.deliveryDays || 0),
  status: gig.status || 'Draft',
  createdAt: gig.createdAt
});

const toAdminOrder = (project) => ({
  id: String(project._id),
  title: project.title || '',
  clientId: String(project.clientId?._id || project.clientId || ''),
  clientName: project.clientName || project.clientId?.fullName || 'Client',
  assignedFreelancerId: String(project.assignedFreelancerId?._id || project.assignedFreelancerId || ''),
  assignedFreelancerName: project.assignedFreelancerName || project.assignedFreelancerId?.fullName || 'Unassigned',
  budget: Number(project.budget || 0),
  status: project.status || 'Open',
  createdAt: project.createdAt
});

const toAdminPayment = (payment) => ({
  id: String(payment._id),
  projectId: String(payment.projectId?._id || payment.projectId || ''),
  projectTitle: payment.projectTitle || payment.projectId?.title || '',
  clientId: String(payment.clientId?._id || payment.clientId || ''),
  clientName: payment.clientId?.fullName || 'Client',
  freelancerId: String(payment.freelancerId?._id || payment.freelancerId || ''),
  freelancerName: payment.freelancerName || payment.freelancerId?.fullName || 'Freelancer',
  amount: Number(payment.amount || 0),
  platformFee: Number(payment.platformFee || 0),
  paymentMethod: payment.paymentMethod || 'Razorpay',
  status: payment.status || 'Pending',
  paymentDate: payment.paymentDate || payment.createdAt
});

const createAdminActivity = async ({ adminId, actionType, targetType, targetId, message, metadata = {} }) => {
  if (!adminId || !actionType || !targetType || !message) return;
  await AdminActivity.create({
    adminId,
    actionType,
    targetType,
    targetId: String(targetId || ''),
    message,
    metadata
  });
};

exports.getOverview = async (req, res) => {
  try {
    const [totalUsers, totalFreelancers, totalClients, totalServices, totalOrders, totalPayments, recentActivities] =
      await Promise.all([
        User.countDocuments({ role: { $ne: 'admin' } }),
        User.countDocuments({ role: 'freelancer' }),
        User.countDocuments({ role: 'client' }),
        Gig.countDocuments({ status: { $ne: 'Deleted' } }),
        Project.countDocuments(),
        Payment.countDocuments(),
        AdminActivity.find({}).sort({ createdAt: -1 }).limit(10).lean()
      ]);

    return res.json({
      success: true,
      overview: {
        totalUsers,
        totalFreelancers,
        totalClients,
        totalServices,
        totalOrders,
        totalPayments
      },
      recentActivities: recentActivities.map((item) => ({
        id: String(item._id),
        actionType: item.actionType,
        message: item.message,
        targetType: item.targetType,
        targetId: item.targetId,
        createdAt: item.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const role = String(req.query.role || '').trim().toLowerCase();
    const search = String(req.query.search || '').trim();
    const query = { role: { $ne: 'admin' } };

    if (role === 'client' || role === 'freelancer') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, users: users.map(toAdminUser) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Blocked'].includes(String(status))) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus: status },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await createAdminActivity({
      adminId: req.user.id,
      actionType: status === 'Blocked' ? 'user_blocked' : 'user_approved',
      targetType: 'user',
      targetId: user._id,
      message: `Admin marked ${user.fullName} as ${status}.`,
      metadata: { userId: String(user._id), email: user.email, status }
    });

    return res.json({ success: true, user: toAdminUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Admin cannot delete own account' });
    }

    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (String(user.role) === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete admin account' });
    }

    await Promise.all([
      User.deleteOne({ _id: req.params.id }),
      Project.deleteMany({ $or: [{ clientId: req.params.id }, { assignedFreelancerId: req.params.id }] }),
      Gig.deleteMany({ freelancerId: req.params.id }),
      Proposal.deleteMany({ freelancerId: req.params.id }),
      Payment.deleteMany({ $or: [{ clientId: req.params.id }, { freelancerId: req.params.id }] })
    ]);

    await createAdminActivity({
      adminId: req.user.id,
      actionType: 'user_deleted',
      targetType: 'user',
      targetId: user._id,
      message: `Admin deleted user ${user.fullName} (${user.email}).`,
      metadata: { userId: String(user._id), email: user.email }
    });

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserProfileByAdmin = async (req, res) => {
  try {
    const payload = {};
    if (req.body.fullName !== undefined) payload.fullName = String(req.body.fullName || '').trim();
    if (req.body.bio !== undefined) payload.bio = String(req.body.bio || '').trim();
    if (req.body.skills !== undefined) payload.skills = Array.isArray(req.body.skills) ? req.body.skills : [];
    if (req.body.hourlyRate !== undefined) payload.hourlyRate = Number(req.body.hourlyRate || 0);

    const user = await User.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await createAdminActivity({
      adminId: req.user.id,
      actionType: 'user_profile_updated',
      targetType: 'user',
      targetId: user._id,
      message: `Admin updated profile fields for ${user.fullName}.`,
      metadata: { userId: String(user._id) }
    });

    return res.json({ success: true, user: toAdminUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const query = {};
    if (status) query.status = status;
    const services = await Gig.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, services: services.map(toAdminService) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateServiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Paused', 'Draft', 'Deleted'].includes(String(status))) {
      return res.status(400).json({ success: false, message: 'Invalid service status' });
    }

    const gig = await Gig.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!gig) return res.status(404).json({ success: false, message: 'Service not found' });

    await createAdminActivity({
      adminId: req.user.id,
      actionType: 'service_status_updated',
      targetType: 'service',
      targetId: gig._id,
      message: `Admin changed service "${gig.title}" status to ${status}.`,
      metadata: { serviceId: String(gig._id), status }
    });

    return res.json({ success: true, service: toAdminService(gig) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateServiceByAdmin = async (req, res) => {
  try {
    const payload = {};
    if (req.body.title !== undefined) payload.title = String(req.body.title || '').trim();
    if (req.body.description !== undefined) payload.description = String(req.body.description || '').trim();
    if (req.body.price !== undefined) payload.price = Number(req.body.price || 0);
    if (req.body.deliveryDays !== undefined) payload.deliveryDays = Number(req.body.deliveryDays || 1);
    payload.updatedAt = new Date();

    const gig = await Gig.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }).lean();
    if (!gig) return res.status(404).json({ success: false, message: 'Service not found' });

    await createAdminActivity({
      adminId: req.user.id,
      actionType: 'service_updated',
      targetType: 'service',
      targetId: gig._id,
      message: `Admin edited service "${gig.title}".`,
      metadata: { serviceId: String(gig._id) }
    });

    return res.json({ success: true, service: toAdminService(gig) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Project.find({})
      .populate('clientId', 'fullName email')
      .populate('assignedFreelancerId', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, orders: orders.map(toAdminOrder) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('clientId', 'fullName email')
      .populate('freelancerId', 'fullName email')
      .populate('projectId', 'title')
      .sort({ paymentDate: -1 })
      .lean();
    return res.json({ success: true, payments: payments.map(toAdminPayment) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.reviewPayment = async (req, res) => {
  try {
    const { action } = req.body;
    if (!['reviewing', 'approve'].includes(String(action))) {
      return res.status(400).json({ success: false, message: 'Invalid review action' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (action === 'reviewing') {
      payment.status = 'Reviewing';
      await payment.save();

      await createNotification(req.app, {
        recipientId: payment.freelancerId,
        actorId: req.user.id,
        type: 'payment_success',
        title: 'Payment review started',
        message: 'Payment is being reviewed and will be transferred in 2-3 working days.',
        linkedEntityType: 'payment',
        linkedEntityId: String(payment._id),
        actionUrl: '/my-projects',
        metadata: { paymentId: String(payment._id), projectId: String(payment.projectId) }
      });
    } else {
      payment.status = 'Completed';
      await payment.save();

      await Promise.all([
        Project.findByIdAndUpdate(payment.projectId, { status: 'Completed' }),
        User.findByIdAndUpdate(payment.freelancerId, {
          $inc: { earnings: Number(payment.amount || 0) - Number(payment.platformFee || 0) }
        })
      ]);

      await createNotification(req.app, {
        recipientId: payment.freelancerId,
        actorId: req.user.id,
        type: 'payment_success',
        title: 'Payment approved by admin',
        message: 'Payment is done through net banking and has been credited successfully.',
        linkedEntityType: 'payment',
        linkedEntityId: String(payment._id),
        actionUrl: '/freelancer-earnings',
        metadata: {
          paymentId: String(payment._id),
          projectId: String(payment.projectId),
          payoutMode: 'net_banking'
        }
      });
    }

    await createAdminActivity({
      adminId: req.user.id,
      actionType: action === 'approve' ? 'payment_approved' : 'payment_reviewing',
      targetType: 'payment',
      targetId: payment._id,
      message:
        action === 'approve'
          ? `Admin approved payment ${payment._id}.`
          : `Admin marked payment ${payment._id} as reviewing.`,
      metadata: { paymentId: String(payment._id), action }
    });

    return res.json({
      success: true,
      payment: toAdminPayment(await Payment.findById(payment._id).populate('clientId', 'fullName').populate('freelancerId', 'fullName').populate('projectId', 'title').lean())
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminActivities = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const activities = await AdminActivity.find({})
      .populate('adminId', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({
      success: true,
      activities: activities.map((activity) => ({
        id: String(activity._id),
        adminName: activity.adminId?.fullName || 'Admin',
        actionType: activity.actionType,
        message: activity.message,
        targetType: activity.targetType,
        targetId: activity.targetId,
        metadata: activity.metadata || {},
        createdAt: activity.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

