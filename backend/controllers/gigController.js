const Gig = require('../models/Gig');
const User = require('../models/User');

// @desc    Create gig
// @route   POST /api/gigs
// @access  Private (Freelancer)
exports.createGig = async (req, res) => {
  try {
    const { title, description, category, tags, portfolioLink, price, deliveryDays, images, status } = req.body;
    const user = await User.findById(req.user.id).select('fullName role');

    if (!user || String(user.role || '').toLowerCase() !== 'freelancer') {
      return res.status(403).json({ success: false, message: 'Only freelancers can create gigs' });
    }

    const gig = await Gig.create({
      title,
      description,
      category,
      tags: Array.isArray(tags) ? tags : [],
      portfolioLink: String(portfolioLink || '').trim(),
      price: Number(price),
      deliveryDays: Number(deliveryDays),
      images: Array.isArray(images) ? images : [],
      status: status || 'Active',
      freelancerId: req.user.id,
      freelancerName: user.fullName || 'Freelancer'
    });

    return res.status(201).json({ success: true, gig });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged-in freelancer gigs
// @route   GET /api/gigs/my
// @access  Private
exports.getMyGigs = async (req, res) => {
  try {
    const gigs = await Gig.find({ freelancerId: req.user.id, status: { $ne: 'Deleted' } })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, gigs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get active gigs for discovery (client side)
// @route   GET /api/gigs/discover
// @access  Private
exports.getDiscoverGigs = async (req, res) => {
  try {
    const gigs = await Gig.find({ status: 'Active' })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, gigs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get gig by id
// @route   GET /api/gigs/:id
// @access  Private (Owner)
exports.getGigById = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id).lean();
    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }
    if (String(gig.freelancerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this gig' });
    }

    return res.json({ success: true, gig });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update gig
// @route   PUT /api/gigs/:id
// @access  Private (Owner)
exports.updateGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }
    if (String(gig.freelancerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this gig' });
    }

    const payload = {
      ...(req.body.title !== undefined && { title: req.body.title }),
      ...(req.body.description !== undefined && { description: req.body.description }),
      ...(req.body.category !== undefined && { category: req.body.category }),
      ...(req.body.tags !== undefined && { tags: Array.isArray(req.body.tags) ? req.body.tags : [] }),
      ...(req.body.portfolioLink !== undefined && { portfolioLink: String(req.body.portfolioLink || '').trim() }),
      ...(req.body.price !== undefined && { price: Number(req.body.price) }),
      ...(req.body.deliveryDays !== undefined && { deliveryDays: Number(req.body.deliveryDays) }),
      ...(req.body.images !== undefined && { images: Array.isArray(req.body.images) ? req.body.images : [] }),
      ...(req.body.status !== undefined && { status: req.body.status }),
      updatedAt: new Date()
    };

    const updated = await Gig.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    return res.json({ success: true, gig: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete gig
// @route   DELETE /api/gigs/:id
// @access  Private (Owner)
exports.deleteGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }
    if (String(gig.freelancerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this gig' });
    }

    await gig.deleteOne();
    return res.json({ success: true, message: 'Gig deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
