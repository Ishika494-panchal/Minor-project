const Notification = require('../models/Notification');
const { emitUnreadCount, toPayload } = require('../services/notificationService');

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const type = String(req.query.type || '').trim();

    const query = {
      recipientId: userId,
      isArchived: { $ne: true },
      ...(type ? { type } : {})
    };

    const [rows, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(query)
    ]);

    const notifications = await Promise.all(rows.map((row) => toPayload(row)));
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
      isArchived: { $ne: true }
    });

    return res.json({
      success: true,
      notifications,
      unreadCount,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
      isArchived: { $ne: true }
    });
    return res.json({ success: true, unreadCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark one notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await emitUnreadCount(req.app, userId);
    return res.json({ success: true, notification: await toPayload(notification) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    await emitUnreadCount(req.app, userId);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Archive (soft-delete) one notification
// @route   PUT /api/notifications/:id/archive
// @access  Private
exports.archiveNotification = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: userId },
      { $set: { isArchived: true, isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await emitUnreadCount(req.app, userId);
    return res.json({ success: true, message: 'Notification archived' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
