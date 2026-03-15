const Proposal = require('../models/Proposal');
const Project = require('../models/Project');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');

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

// @desc    Get freelancer profile details for proposal view
// @route   GET /api/proposals/freelancer-profile/:freelancerId
// @access  Private
exports.getFreelancerProfile = async (req, res) => {
  try {
    const { freelancerId } = req.params;
    const freelancer = await User.findById(freelancerId)
      .select('fullName email bio skills hourlyRate earnings createdAt profileImage role')
      .lean();

    if (!freelancer) {
      return res.status(404).json({ success: false, message: 'Freelancer not found' });
    }

    const [latestProposal, acceptedProposals, totalProposals] = await Promise.all([
      Proposal.findOne({ freelancerId })
        .select('rating portfolioLink deliveryTime proposedBudget')
        .sort({ createdAt: -1 })
        .lean(),
      Proposal.countDocuments({ freelancerId, status: 'accepted' }),
      Proposal.countDocuments({ freelancerId })
    ]);

    const freelancerProfile = {
      id: String(freelancer._id),
      fullName: freelancer.fullName || 'Freelancer',
      email: freelancer.email || '',
      bio: freelancer.bio || 'No profile description provided yet.',
      skills: Array.isArray(freelancer.skills) ? freelancer.skills : [],
      hourlyRate: Number(freelancer.hourlyRate || 0),
      earnings: Number(freelancer.earnings || 0),
      memberSince: freelancer.createdAt,
      profileImage: freelancer.profileImage || '',
      rating: Number(latestProposal?.rating || 0),
      portfolioLink: latestProposal?.portfolioLink || '',
      deliveryTime: Number(latestProposal?.deliveryTime || 0),
      proposedBudget: Number(latestProposal?.proposedBudget || 0),
      acceptedProposals,
      totalProposals
    };

    return res.json({ success: true, freelancerProfile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
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

    await createNotification(req.app, {
      recipientId: project.clientId,
      actorId: req.user.id,
      type: 'order_created',
      title: 'New proposal received',
      message: `${user.fullName || 'Freelancer'} submitted a proposal for "${project.title}"`,
      linkedEntityType: 'proposal',
      linkedEntityId: String(proposal._id),
      actionUrl: '/view-proposals',
      metadata: {
        projectId: String(project._id),
        proposalId: String(proposal._id)
      }
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
        budget: Number(proposal.proposedBudget || project.budget || 0),
        assignedFreelancerId: proposal.freelancerId,
        assignedFreelancerName: proposal.freelancerName,
        clientApprovedForPayment: false,
        clientApprovedAt: null,
        resubmissionReason: '',
        resubmissionRequestedAt: null
      });

      // Ensure one project-linked conversation exists as soon as order starts.
      await Conversation.findOneAndUpdate(
        {
          conversationType: 'project',
          projectId: project._id,
          clientId: project.clientId,
          freelancerId: proposal.freelancerId
        },
        {
          $setOnInsert: {
            status: 'active',
            messagingAllowed: true
          }
        },
        { upsert: true, new: true }
      );

      await createNotification(req.app, {
        recipientId: proposal.freelancerId,
        actorId: req.user.id,
        type: 'order_accepted',
        title: 'Proposal accepted',
        message: `${project.clientName || 'Client'} accepted your proposal for "${project.title}"`,
        linkedEntityType: 'project',
        linkedEntityId: String(project._id),
        actionUrl: `/my-projects`,
        metadata: {
          projectId: String(project._id),
          proposalId: String(proposal._id)
        }
      });
    } else if (status === 'rejected') {
      await createNotification(req.app, {
        recipientId: proposal.freelancerId,
        actorId: req.user.id,
        type: 'system_alert',
        title: 'Proposal update',
        message: `Your proposal for "${project.title}" was not selected.`,
        linkedEntityType: 'proposal',
        linkedEntityId: String(proposal._id),
        actionUrl: '/find-jobs',
        metadata: {
          projectId: String(project._id),
          proposalId: String(proposal._id)
        }
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

