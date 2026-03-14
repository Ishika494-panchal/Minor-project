const express = require('express');
const router = express.Router();
const { 
  getProposalsByProject, 
  getClientProposals,
  getFreelancerProposals, 
  createProposal, 
  updateProposalStatus,
  getProposalById,
  deleteProposal
} = require('../controllers/proposalController');
const { protect } = require('../middleware/authMiddleware');

router.get('/project/:projectId', protect, getProposalsByProject);
router.get('/client/:clientId', protect, getClientProposals);
router.get('/freelancer/:freelancerId', protect, getFreelancerProposals);
router.get('/:id', protect, getProposalById);
router.post('/', protect, createProposal);
router.put('/:id/status', protect, updateProposalStatus);
router.delete('/:id', protect, deleteProposal);

module.exports = router;

