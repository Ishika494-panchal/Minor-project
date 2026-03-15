const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createGig,
  getMyGigs,
  getDiscoverGigs,
  getGigById,
  updateGig,
  deleteGig
} = require('../controllers/gigController');

router.get('/my', protect, getMyGigs);
router.get('/discover', protect, getDiscoverGigs);
router.get('/:id', protect, getGigById);
router.post('/', protect, createGig);
router.put('/:id', protect, updateGig);
router.delete('/:id', protect, deleteGig);

module.exports = router;
