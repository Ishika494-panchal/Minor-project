const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get conversations for a user
// @route   GET /api/messages/conversations/:userId
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get unique conversation partners
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ createdAt: -1 });
    
    const conversations = {};
    
    messages.forEach(msg => {
      const partnerId = msg.senderId.toString() === userId ? msg.receiverId.toString() : msg.senderId.toString();
      
      if (!conversations[partnerId]) {
        conversations[partnerId] = {
          partnerId,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: 0
        };
      }
      
      // Count unread messages
      if (msg.receiverId.toString() === userId && !msg.isRead) {
        conversations[partnerId].unreadCount++;
      }
    });
    
    // Populate partner details
    const partnerIds = Object.keys(conversations);
    const partners = await User.find({ _id: { $in: partnerIds } }).select('fullName email profilePicture');
    
    const result = partners.map(partner => ({
      partner: {
        id: partner._id,
        fullName: partner.fullName,
        email: partner.email,
        profilePicture: partner.profilePicture
      },
      lastMessage: conversations[partner._id.toString()].lastMessage,
      lastMessageTime: conversations[partner._id.toString()].lastMessageTime,
      unreadCount: conversations[partner._id.toString()].unreadCount
    }));
    
    res.json({ success: true, conversations: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get messages between two users
// @route   GET /api/messages/:userId/:partnerId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { userId, partnerId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });
    
    // Mark messages as read
    await Message.updateMany(
      { senderId: partnerId, receiverId: userId, isRead: false },
      { isRead: true }
    );
    
    res.json({ success: true, messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, projectId, content } = req.body;
    
    const message = await Message.create({
      senderId: req.user.id,
      receiverId,
      projectId,
      content
    });
    
    // Populate sender details
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'fullName email')
      .populate('receiverId', 'fullName email');
    
    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:partnerId
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const userId = req.user.id;
    
    await Message.updateMany(
      { senderId: partnerId, receiverId: userId, isRead: false },
      { isRead: true }
    );
    
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

