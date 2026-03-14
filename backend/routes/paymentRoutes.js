const express = require('express');
const router = express.Router();
const { 
  getPayments, 
  getPaymentById, 
  createPayment, 
  updatePaymentStatus,
  getPaymentSummary,
  createRazorpayOrder,
  verifyPayment,
  getRazorpayKey
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/key', getRazorpayKey);
router.get('/', protect, getPayments);
router.get('/summary/:userId', protect, getPaymentSummary);
router.get('/:id', protect, getPaymentById);
router.post('/', protect, createPayment);
router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify', protect, verifyPayment);
router.put('/:id/status', protect, updatePaymentStatus);

module.exports = router;

