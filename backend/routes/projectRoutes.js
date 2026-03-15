const express = require('express');
const router = express.Router();
const { 
  getProjects, 
  getProjectById, 
  createProject, 
  updateProject, 
  deleteProject,
  getClientProjects,
  getMyClientProjects,
  getFreelancerProjects,
  getOpenProjects,
  submitProjectWork,
  uploadProjectSubmission,
  reviewSubmittedProject
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProjectZip } = require('../middleware/uploadMiddleware');

// Public routes
router.get('/open', getOpenProjects);
router.get('/my', protect, getMyClientProjects);
router.get('/client/:clientId', protect, getClientProjects);
router.get('/freelancer/:freelancerId', protect, getFreelancerProjects);

// Protected routes
router.post('/', protect, createProject);
router.post('/:id/submission', protect, uploadProjectZip.single('codeZip'), uploadProjectSubmission);
router.put('/:id/submit', protect, submitProjectWork);
router.put('/:id/review-submission', protect, reviewSubmittedProject);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

// Get all projects with filters
router.get('/', getProjects);
router.get('/:id', getProjectById);

module.exports = router;

