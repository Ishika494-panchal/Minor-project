const Notification = require('../models/Notification');
const User = require('../models/User');

const ROOM_FOR_USER = (userId) => `user:${String(userId)}`;

const safeText = (value, fallback = '') => {
  const text = String(value || '').trim();
  return text || fallback;
};

const toPayload = async (notificationDoc) => {
  const notification = notificationDoc.toObject ? notificationDoc.toObject() : notificationDoc;
  let actor = null;
  if (notification.actorId) {
    const actorUser = await User.findById(notification.actorId).select('fullName email profileImage').lean();
    actor = actorUser
      ? {
          id: String(actorUser._id),
          fullName: actorUser.fullName || 'User',
          email: actorUser.email || '',
          profileImage: actorUser.profileImage || ''
        }
      : null;
  }

  return {
    id: String(notification._id),
    recipientId: String(notification.recipientId),
    actor,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    linkedEntityType: notification.linkedEntityType,
    linkedEntityId: notification.linkedEntityId || '',
    actionUrl: notification.actionUrl || '',
    metadata: notification.metadata || {},
    isRead: !!notification.isRead,
    createdAt: notification.createdAt
  };
};

const emitUnreadCount = async (app, recipientId) => {
  const io = app?.get('io');
  if (!io || !recipientId) return;
  const unreadCount = await Notification.countDocuments({
    recipientId,
    isRead: false,
    isArchived: { $ne: true }
  });
  io.to(ROOM_FOR_USER(recipientId)).emit('notification:count', { unreadCount });
};

const createNotification = async (app, input) => {
  const recipientId = safeText(input.recipientId);
  if (!recipientId) return null;

  const notification = await Notification.create({
    recipientId,
    actorId: input.actorId || null,
    type: input.type,
    title: safeText(input.title, 'New notification'),
    message: safeText(input.message, 'You have a new update.'),
    linkedEntityType: input.linkedEntityType || 'system',
    linkedEntityId: safeText(input.linkedEntityId),
    actionUrl: safeText(input.actionUrl),
    metadata: input.metadata || {}
  });

  const io = app?.get('io');
  if (io) {
    const payload = await toPayload(notification);
    io.to(ROOM_FOR_USER(recipientId)).emit('notification:new', payload);
  }
  await emitUnreadCount(app, recipientId);

  return notification;
};

module.exports = {
  createNotification,
  emitUnreadCount,
  toPayload
};
