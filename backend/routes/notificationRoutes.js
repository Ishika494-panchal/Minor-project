const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification
} = require('../controllers/notificationController');

router.get('/', protect, getMyNotifications);
router.get('/unread-count', protect, getUnreadNotificationCount);
router.put('/read-all', protect, markAllNotificationsAsRead);
router.put('/:id/archive', protect, archiveNotification);
router.put('/:id/read', protect, markNotificationAsRead);

module.exports = router;
