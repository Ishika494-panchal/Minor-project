const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getOverview,
  getAdminActivities,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  updateUserProfileByAdmin,
  getAllServices,
  updateServiceStatus,
  updateServiceByAdmin,
  getAllOrders,
  getAllPayments,
  reviewPayment
} = require('../controllers/adminController');

router.use(protect, admin);

router.get('/overview', getOverview);
router.get('/activities', getAdminActivities);

router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/profile', updateUserProfileByAdmin);
router.delete('/users/:id', deleteUser);

router.get('/services', getAllServices);
router.put('/services/:id/status', updateServiceStatus);
router.put('/services/:id', updateServiceByAdmin);

router.get('/orders', getAllOrders);

router.get('/payments', getAllPayments);
router.put('/payments/:id/review', reviewPayment);

module.exports = router;
