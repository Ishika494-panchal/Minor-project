const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Project = require('../models/Project');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');

const ALLOWED_MESSAGE_TYPES = new Set([
  'text',
  'image',
  'file',
  'delivery_submission',
  'revision_request',
  'payment_update',
  'system_notice'
]);

const ROOM_FOR_USER = (userId) => `user:${String(userId)}`;

const getPreviewText = ({ messageType, textContent, attachment }) => {
  const cleanText = String(textContent || '').trim();
  if (cleanText) return cleanText.slice(0, 160);
  if (attachment?.fileName) return `[${messageType}] ${attachment.fileName}`.slice(0, 160);
  return `[${messageType}]`;
};

const isParticipant = (conversation, userId) =>
  String(conversation.clientId) === String(userId) || String(conversation.freelancerId) === String(userId);

const getReceiverForSender = (conversation, senderId) => {
  if (String(conversation.clientId) === String(senderId)) return String(conversation.freelancerId);
  return String(conversation.clientId);
};

const unreadFieldForUser = (conversation, userId) =>
  String(conversation.clientId) === String(userId) ? 'unreadCountClient' : 'unreadCountFreelancer';

const getProjectMessagingValidation = async (projectId, userId) => {
  if (!projectId) {
    return { ok: true, project: null };
  }

  const project = await Project.findById(projectId).select(
    'clientId assignedFreelancerId status title'
  );
  if (!project) {
    return { ok: false, status: 404, message: 'Project not found' };
  }

  const allowedProjectStatuses = new Set(['Open', 'In Progress', 'Submitted', 'Completed', 'Disputed']);
  if (!allowedProjectStatuses.has(String(project.status || ''))) {
    return {
      ok: false,
      status: 400,
      message: `Messaging is not allowed for project status: ${project.status}`
    };
  }

  const isClient = String(project.clientId) === String(userId);
  const isFreelancer = String(project.assignedFreelancerId || '') === String(userId);
  if (!isClient && !isFreelancer) {
    return { ok: false, status: 403, message: 'You are not part of this project conversation' };
  }

  return { ok: true, project };
};

// @desc    Create or get conversation
// @route   POST /api/messages/conversations/ensure
// @access  Private
exports.ensureConversation = async (req, res) => {
  try {
    const userId = String(req.user.id || req.user._id);
    const { partnerId, projectId = null, orderId = '', conversationType = 'project' } = req.body || {};

    if (!partnerId) {
      return res.status(400).json({ success: false, message: 'partnerId is required' });
    }

    const partner = await User.findById(partnerId).select('_id role');
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner user not found' });
    }

    const projectValidation = await getProjectMessagingValidation(projectId, userId);
    if (!projectValidation.ok) {
      return res
        .status(projectValidation.status)
        .json({ success: false, message: projectValidation.message });
    }

    const requester = await User.findById(userId).select('_id role');
    if (!requester) {
      return res.status(401).json({ success: false, message: 'Requester not found' });
    }

    const requesterRole = String(requester.role || '').toLowerCase();
    const partnerRole = String(partner.role || '').toLowerCase();
    let clientId = '';
    let freelancerId = '';

    if (requesterRole === 'client' && partnerRole === 'freelancer') {
      clientId = userId;
      freelancerId = String(partner._id);
    } else if (requesterRole === 'freelancer' && partnerRole === 'client') {
      clientId = String(partner._id);
      freelancerId = userId;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Conversation requires one client and one freelancer'
      });
    }

    const safeConversationType = ['project', 'order', 'support', 'dispute', 'direct'].includes(conversationType)
      ? conversationType
      : 'project';

    const basePairQuery = { clientId, freelancerId };
    const exactQuery = {
      ...basePairQuery,
      conversationType: safeConversationType,
      ...(projectId ? { projectId } : { projectId: null }),
      ...(orderId ? { orderId: String(orderId) } : { orderId: '' })
    };

    let conversation = await Conversation.findOne(exactQuery);

    // Prevent duplicate chats for same user pair:
    // if exact match does not exist, reuse latest direct/project thread.
    if (!conversation) {
      conversation = await Conversation.findOne({
        ...basePairQuery,
        conversationType: { $in: ['direct', 'project'] }
      }).sort({ updatedAt: -1 });
    }

    if (!conversation) {
      conversation = await Conversation.create({
        ...exactQuery,
        status: 'active',
        messagingAllowed: true
      });
    }

    const populated = await Conversation.findById(conversation._id)
      .populate('clientId', 'fullName email profileImage role')
      .populate('freelancerId', 'fullName email profileImage role')
      .populate('projectId', 'title status');

    return res.json({ success: true, conversation: populated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List current user's conversations
// @route   GET /api/messages/conversations
// @access  Private
exports.getMyConversations = async (req, res) => {
  try {
    const userId = String(req.user.id || req.user._id);
    const role = String(req.user.role || '').toLowerCase();
    const query = role === 'client' ? { clientId: userId } : { freelancerId: userId };

    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .populate('clientId', 'fullName email profileImage role')
      .populate('freelancerId', 'fullName email profileImage role')
      .populate('projectId', 'title status')
      .lean();

    const mapped = conversations.map((conversation) => {
      const isClient = role === 'client';
      const partner = isClient ? conversation.freelancerId : conversation.clientId;
      const unreadCount = isClient ? conversation.unreadCountClient : conversation.unreadCountFreelancer;

      return {
        id: String(conversation._id),
        conversationType: conversation.conversationType,
        status: conversation.status,
        projectId: conversation.projectId?._id ? String(conversation.projectId._id) : null,
        projectTitle: conversation.projectId?.title || '',
        orderId: conversation.orderId || '',
        partner: {
          id: String(partner?._id || ''),
          fullName: partner?.fullName || 'Unknown User',
          email: partner?.email || '',
          profileImage: partner?.profileImage || ''
        },
        lastMessage: conversation.lastMessagePreview || '',
        lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
        unreadCount
      };
    });

    // Defensive dedupe for legacy duplicate rows:
    // keep one conversation per partner, prefer the latest activity.
    const dedupedByPartner = new Map();
    for (const item of mapped) {
      const key = String(item.partner.id || '');
      if (!key) continue;
      const existing = dedupedByPartner.get(key);
      if (!existing) {
        dedupedByPartner.set(key, item);
        continue;
      }

      const existingTs = new Date(existing.lastMessageAt || 0).getTime();
      const currentTs = new Date(item.lastMessageAt || 0).getTime();
      if (currentTs > existingTs) {
        dedupedByPartner.set(key, {
          ...item,
          unreadCount: Number(existing.unreadCount || 0) + Number(item.unreadCount || 0)
        });
      } else {
        dedupedByPartner.set(key, {
          ...existing,
          unreadCount: Number(existing.unreadCount || 0) + Number(item.unreadCount || 0)
        });
      }
    }

    const deduped = Array.from(dedupedByPartner.values()).sort(
      (a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
    );

    return res.json({ success: true, conversations: deduped });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get conversation messages (paginated)
// @route   GET /api/messages/conversations/:conversationId/messages
// @access  Private
exports.getConversationMessages = async (req, res) => {
  try {
    const userId = String(req.user.id || req.user._id);
    const { conversationId } = req.params;
    const { before, limit = 50 } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ success: false, message: 'Not part of this conversation' });
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const msgQuery = { conversationId };
    if (before) {
      msgQuery.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(msgQuery)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .populate('senderId', 'fullName email profileImage')
      .populate('receiverId', 'fullName email profileImage')
      .lean();

    const chronological = messages.reverse();

    return res.json({
      success: true,
      messages: chronological,
      hasMore: messages.length === safeLimit
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send a message in conversation
// @route   POST /api/messages/conversations/:conversationId/messages
// @access  Private
exports.sendConversationMessage = async (req, res) => {
  try {
    const senderId = String(req.user.id || req.user._id);
    const { conversationId } = req.params;
    const {
      textContent = '',
      messageType = 'text',
      attachment = null
    } = req.body || {};

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!isParticipant(conversation, senderId)) {
      return res.status(403).json({ success: false, message: 'Not part of this conversation' });
    }

    if (!conversation.messagingAllowed || ['blocked', 'archived'].includes(String(conversation.status))) {
      return res.status(400).json({ success: false, message: 'Messaging is not allowed in this conversation' });
    }

    const projectValidation = await getProjectMessagingValidation(conversation.projectId, senderId);
    if (!projectValidation.ok) {
      return res
        .status(projectValidation.status)
        .json({ success: false, message: projectValidation.message });
    }

    if (!ALLOWED_MESSAGE_TYPES.has(String(messageType))) {
      return res.status(400).json({ success: false, message: 'Invalid message type' });
    }

    const cleanText = String(textContent || '').trim();
    const hasAttachment = !!(attachment && (attachment.fileName || attachment.fileData || attachment.fileUrl));
    if (!cleanText && !hasAttachment) {
      return res.status(400).json({ success: false, message: 'Message text or attachment is required' });
    }

    const receiverId = getReceiverForSender(conversation, senderId);
    const io = req.app.get('io');
    const receiverRoom = ROOM_FOR_USER(receiverId);
    const receiverOnline = !!io && io.sockets.adapter.rooms.get(receiverRoom)?.size > 0;

    const message = await Message.create({
      conversationId: conversation._id,
      projectId: conversation.projectId || null,
      orderId: conversation.orderId || '',
      senderId,
      receiverId,
      messageType,
      textContent: cleanText,
      attachment: hasAttachment
        ? {
            fileName: String(attachment.fileName || ''),
            fileType: String(attachment.fileType || ''),
            fileSize: Number(attachment.fileSize || 0),
            fileData: String(attachment.fileData || ''),
            fileUrl: String(attachment.fileUrl || ''),
            thumbnailUrl: String(attachment.thumbnailUrl || ''),
            uploadedAt: new Date()
          }
        : undefined,
      deliveryStatus: receiverOnline ? 'delivered' : 'sent',
      isRead: false
    });

    const unreadField = unreadFieldForUser(conversation, receiverId);
    conversation.lastMessagePreview = getPreviewText({ messageType, textContent: cleanText, attachment });
    conversation.lastMessageType = messageType;
    conversation.lastMessageAt = new Date();
    conversation[unreadField] = (conversation[unreadField] || 0) + 1;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'fullName email profileImage')
      .populate('receiverId', 'fullName email profileImage')
      .lean();

    if (io) {
      io.to(ROOM_FOR_USER(senderId)).emit('chat:message:new', { message: populatedMessage });
      io.to(receiverRoom).emit('chat:message:new', { message: populatedMessage });
      io.to(ROOM_FOR_USER(senderId)).emit('chat:conversation:update', { conversationId: String(conversation._id) });
      io.to(receiverRoom).emit('chat:conversation:update', { conversationId: String(conversation._id) });
    }

    const senderName = req.user?.fullName || 'Someone';
    await createNotification(req.app, {
      recipientId: receiverId,
      actorId: senderId,
      type: 'chat_message',
      title: 'New message',
      message: `${senderName} sent you a new message`,
      linkedEntityType: 'conversation',
      linkedEntityId: String(conversation._id),
      actionUrl:
        String(req.user?.role || '').toLowerCase() === 'client'
          ? `/freelancer-messages?partnerId=${senderId}&projectId=${conversation.projectId || ''}`
          : `/client-messages?partnerId=${senderId}&projectId=${conversation.projectId || ''}`,
      metadata: {
        conversationId: String(conversation._id),
        projectId: conversation.projectId ? String(conversation.projectId) : '',
        messageId: String(message._id)
      }
    });

    return res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark a conversation as read for current user
// @route   PUT /api/messages/conversations/:conversationId/read
// @access  Private
exports.markConversationAsRead = async (req, res) => {
  try {
    const userId = String(req.user.id || req.user._id);
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ success: false, message: 'Not part of this conversation' });
    }

    await Message.updateMany(
      { conversationId, receiverId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date(), deliveryStatus: 'read' } }
    );

    const unreadField = unreadFieldForUser(conversation, userId);
    conversation[unreadField] = 0;
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(ROOM_FOR_USER(userId)).emit('chat:conversation:update', { conversationId: String(conversation._id) });
      io.to(ROOM_FOR_USER(getReceiverForSender(conversation, userId))).emit('chat:message:read', {
        conversationId: String(conversation._id),
        readBy: userId
      });
    }

    return res.json({ success: true, message: 'Conversation marked as read' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

