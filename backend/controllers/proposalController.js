const Proposal = require('../models/Proposal');
const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Get proposals for a project
// @route   GET /api/proposals/project/:projectId
// @access  Private
exports.getProposalsByProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.clientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these proposals' });
    }

    const proposals = await Proposal.find({ projectId: req.params.projectId })
      .select('projectId projectTitle freelancerId freelancerName freelancerProfilePicture rating proposedBudget deliveryTime proposalMessage portfolioLink status createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ success: true, proposals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all proposals for client's projects
// @route   GET /api/proposals/client/:clientId
// @access  Private (Client)
exports.getClientProposals = async (req, res) => {
  try {
    if (req.user.id !== req.params.clientId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these proposals' });
    }

    const projection = 'projectId projectTitle clientId clientName freelancerId freelancerName freelancerProfilePicture rating proposedBudget deliveryTime proposalMessage portfolioLink status createdAt';

    // Fast path: most records should have clientId populated.
    const proposalsByClient = await Proposal.find({ clientId: req.params.clientId })
      .select(projection)
      .sort({ createdAt: -1 })
      .lean();

    if (proposalsByClient.length) {
      return res.json({ success: true, proposals: proposalsByClient });
    }

    // Legacy fallback: older records may only be linked via projectId.
    const clientProjects = await Project.find({ clientId: req.params.clientId }).select('_id').lean();
    const projectIds = clientProjects.map((p) => p._id);

    const legacyProposals = projectIds.length
      ? await Proposal.find({ projectId: { $in: projectIds } })
          .select(projection)
          .sort({ createdAt: -1 })
          .lean()
      : [];

    res.json({ success: true, proposals: legacyProposals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get freelancer's proposals
// @route   GET /api/proposals/freelancer/:freelancerId
// @access  Private
exports.getFreelancerProposals = async (req, res) => {
  try {
    if (req.user.id !== req.params.freelancerId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these proposals' });
    }

    const proposals = await Proposal.find({ freelancerId: req.params.freelancerId })
      .select('projectId projectTitle clientId clientName freelancerId freelancerName freelancerProfilePicture rating proposedBudget deliveryTime proposalMessage portfolioLink status createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ success: true, proposals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create proposal
// @route   POST /api/proposals
// @access  Private (Freelancer)
exports.createProposal = async (req, res) => {
  try {
const { projectId, projectTitle, proposedBudget, deliveryTime, proposalMessage, portfolioLink } = req.body;
    
    const user = await User.findById(req.user.id);
    
    // Check if project exists and is open
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (project.status !== 'Open') {
      return res.status(400).json({ success: false, message: 'Project is not open for proposals' });
    }
    
    // Check if freelancer already submitted proposal
    const existingProposal = await Proposal.findOne({
      projectId,
      freelancerId: req.user.id
    });
    
    if (existingProposal) {
      return res.status(400).json({ success: false, message: 'You already submitted a proposal' });
    }
    
    const proposal = await Proposal.create({
      projectId,
      projectTitle,
      clientId: project.clientId,
      clientName: project.clientName || '',
      freelancerId: req.user.id,
      freelancerName: user.fullName,
      freelancerProfilePicture: user.profilePicture || '',
      rating: user.rating || 0,
      proposedBudget,
      deliveryTime,
      proposalMessage,
      portfolioLink: portfolioLink || ''
    });
    
    res.status(201).json({
      success: true,
      proposal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update proposal status
// @route   PUT /api/proposals/:id/status
// @access  Private
exports.updateProposalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['accepted', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid proposal status' });
    }
    
    let proposal = await Proposal.findById(req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    
    const project = await Project.findById(proposal.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.clientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this proposal' });
    }

    proposal = await Proposal.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    // If accepted, update project
    if (status === 'accepted') {
      // Reject other proposals
      await Proposal.updateMany(
        { projectId: project._id, _id: { $ne: proposal._id } },
        { status: 'rejected' }
      );
      
      // Update project
      await Project.findByIdAndUpdate(project._id, {
        status: 'In Progress',
        assignedFreelancerId: proposal.freelancerId,
        assignedFreelancerName: proposal.freelancerName
      });
    }
    
    res.json({ success: true, proposal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get proposal by ID
// @route   GET /api/proposals/:id
// @access  Private
exports.getProposalById = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    
    res.json({ success: true, proposal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete proposal
// @route   DELETE /api/proposals/:id
// @access  Private
exports.deleteProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    
    // Check ownership
    if (proposal.freelancerId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    
    // Only allow delete if status is pending
    if (proposal.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot delete accepted or rejected proposals' });
    }
    
    await proposal.deleteOne();
    
    res.json({ success: true, message: 'Proposal deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

