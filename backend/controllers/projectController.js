const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const User = require('../models/User');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
exports.getProjects = async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (category && category !== 'All') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Project.countDocuments(query);
    
    res.json({
      success: true,
      projects,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Public
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('clientId', 'fullName email');
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    res.json({ success: true, project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Client)
exports.createProject = async (req, res) => {
  try {
    const { title, description, category, skills, budget, deadline, experienceLevel, projectType, attachments, allowProposals } = req.body;
    
    const user = await User.findById(req.user.id);
    
    const project = await Project.create({
      title,
      description,
      category,
      skills,
      budget,
      deadline,
      experienceLevel,
      projectType,
      attachments,
      allowProposals,
      clientId: req.user.id,
      clientName: user.fullName
    });
    
    res.status(201).json({
      success: true,
      project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Project Owner)
exports.updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check ownership
    if (project.clientId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    
    project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Project Owner)
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check ownership
    if (project.clientId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    
    // Delete associated proposals
    await Proposal.deleteMany({ projectId: req.params.id });
    
    await project.deleteOne();
    
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get client's projects
// @route   GET /api/projects/client/:clientId
// @access  Private
exports.getClientProjects = async (req, res) => {
  try {
    // Always use authenticated user ID to avoid frontend/clientId mismatch issues.
    const projects = await Project.find({ clientId: req.user.id })
      .select('title description budget deadline status assignedFreelancerId assignedFreelancerName submissionCodeFileName submissionCodeFilePath submissionHostedLink createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ success: true, projects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged-in client's projects
// @route   GET /api/projects/my
// @access  Private (Client)
exports.getMyClientProjects = async (req, res) => {
  try {
    const normalizedRole = String(req.user.role || '').toLowerCase();
    if (normalizedRole !== 'client') {
      return res.status(403).json({ success: false, message: 'Only client accounts can access client projects' });
    }

    const projects = await Project.find({ clientId: req.user.id })
      .select('title description budget deadline status assignedFreelancerId assignedFreelancerName submissionCodeFileName submissionCodeFilePath submissionHostedLink createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, projects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get freelancer's projects
// @route   GET /api/projects/freelancer/:freelancerId
// @access  Private
exports.getFreelancerProjects = async (req, res) => {
  try {
    // Always use authenticated freelancer ID for consistency with session token.
    const projects = await Project.find({ assignedFreelancerId: req.user.id })
      .select('title description clientId clientName budget deadline status submissionCodeFileName submissionCodeFilePath submissionHostedLink createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ success: true, projects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit freelancer work for project
// @route   PUT /api/projects/:id/submit
// @access  Private (Assigned Freelancer)
exports.submitProjectWork = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!project.assignedFreelancerId || project.assignedFreelancerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to submit this project' });
    }

    if (project.status === 'Submitted') {
      return res.json({ success: true, project, message: 'Project already submitted' });
    }

    if (project.status !== 'In Progress') {
      return res.status(400).json({ success: false, message: 'Project is not in progress' });
    }

    if (!project.submissionHostedLink) {
      return res.status(400).json({ success: false, message: 'Please upload hosted link first' });
    }

    project.status = 'Submitted';
    await project.save();

    res.json({ success: true, project, message: 'Work submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload project code zip and/or hosted link
// @route   POST /api/projects/:id/submission
// @access  Private (Assigned Freelancer)
exports.uploadProjectSubmission = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const requesterId = String(req.user.id || req.user._id || '');
    const assignedId = project.assignedFreelancerId ? project.assignedFreelancerId.toString() : '';
    const assignedByName = !!project.assignedFreelancerName && !!req.user.fullName &&
      project.assignedFreelancerName.trim().toLowerCase() === req.user.fullName.trim().toLowerCase();

    if ((!assignedId || assignedId !== requesterId) && !assignedByName) {
      return res.status(403).json({ success: false, message: 'Not authorized to upload for this project' });
    }

    const hostedLink = String(req.body?.hostedLink || '').trim();
    if (hostedLink) {
      project.submissionHostedLink = hostedLink;
    }

    if (req.file) {
      project.submissionCodeFileName = req.file.originalname;
      project.submissionCodeFilePath = `/uploads/submissions/${req.file.filename}`;
    }

    if (!hostedLink && !req.file) {
      return res.status(400).json({ success: false, message: 'Provide hosted link or zip file' });
    }

    project.submissionUploadedAt = new Date();
    await project.save();

    return res.json({
      success: true,
      message: 'Submission details saved',
      project
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get open projects (for freelancers to browse)
// @route   GET /api/projects/open
// @access  Public
exports.getOpenProjects = async (req, res) => {
  try {
    const projects = await Project.find({ status: 'Open' })
      .select('title description category skills budget deadline experienceLevel projectType allowProposals clientId clientName status createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ success: true, projects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

