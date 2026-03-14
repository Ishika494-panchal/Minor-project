const express = require('express');
const router = express.Router();
const { 
  getConversations, 
  getMessages, 
  sendMessage,
  markAsRead
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/conversations/:userId', protect, getConversations);
router.get('/:userId/:partnerId', protect, getMessages);
router.post('/', protect, sendMessage);
router.put('/read/:partnerId', protect, markAsRead);

module.exports = router;

