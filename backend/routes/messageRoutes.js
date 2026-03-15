const express = require('express');
const router = express.Router();
const { 
  ensureConversation,
  getMyConversations,
  getConversationMessages,
  sendConversationMessage,
  markConversationAsRead
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/conversations/ensure', protect, ensureConversation);
router.get('/conversations', protect, getMyConversations);
router.get('/conversations/:conversationId/messages', protect, getConversationMessages);
router.post('/conversations/:conversationId/messages', protect, sendConversationMessage);
router.put('/conversations/:conversationId/read', protect, markConversationAsRead);

module.exports = router;

