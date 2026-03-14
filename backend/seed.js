const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Project = require('./models/Project');
const Gig = require('./models/Gig');
const Proposal = require('./models/Proposal');
const Payment = require('./models/Payment');
// Models loaded after connectDB
const Message = require('./models/Message');
const Review = require('./models/Review');
const Report = require('./models/Report');

connectDB();

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Gig.deleteMany({});
    await Proposal.deleteMany({});
    await Payment.deleteMany({});
    await Message.deleteMany({});
    await Review.deleteMany({});
    await Report.deleteMany({});

    // Create users
    const client = await User.create({
      fullName: 'John Smith',
      email: 'client@test.com',
      password: '123456',
      role: 'client',
      profile: {
        bio: 'Business owner looking for development services.',
        profilePicture: '',
        skills: [],
        rating: 0,
        totalProjects: 0
      },
      isVerified: true
    });

    const freelancer = await User.create({
      fullName: 'Jane Doe',
      email: 'freelancer@test.com',
      password: '123456',
      role: 'freelancer',
      profile: {
        bio: 'Full-stack developer with 5+ years experience.',
        profilePicture: '',
        skills: ['React', 'Node.js', 'MongoDB'],
        rating: 4.8,
        totalProjects: 12
      },
      isVerified: true
    });

    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin@test.com',
      password: '123456',
      role: 'admin',
      profile: {
        bio: 'Platform administrator.',
        profilePicture: '',
        skills: [],
        rating: 0,
        totalProjects: 0
      },
      isVerified: true
    });

    const users = [client, freelancer, admin];

    // Sample Projects
    const project1 = await Project.create({
      title: 'E-commerce Website Development',
      description: 'Build modern React e-commerce site with payment integration.',
      category: 'Web Development',
      skills: ['React', 'Node.js', 'MongoDB'],
      budget: 25000,
      experienceLevel: 'Intermediate',
      clientId: client._id,
      clientName: 'John Smith',
      status: 'Open',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    const project2 = await Project.create({
      title: 'Mobile App UI Design',
      description: 'Design beautiful UI for fitness tracking app.',
      category: 'UI/UX Design',
      skills: ['Figma', 'UI Design'],
      budget: 15000,
      experienceLevel: 'Beginner',
      clientId: client._id,
      clientName: 'John Smith',
      status: 'Open',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    });

    // Sample Gigs
    const gig1 = await Gig.create({
      title: 'React Component Development',
      description: 'Custom React components for your project.',
      category: 'Web Development',
      subcategory: 'Frontend',
      tags: ['React', 'TypeScript'],
      price: 5000,
      deliveryDays: 14,
      freelancerId: freelancer._id,
      freelancerName: 'Jane Doe',
      status: 'Active',
      images: []
    });

    // Sample Proposals
    const proposal1 = await Proposal.create({
      projectId: project1._id,
      projectTitle: project1.title,
      freelancerId: freelancer._id,
      freelancerName: 'Jane Doe',
      freelancerProfilePicture: '',
      clientId: client._id,
      proposedBudget: 20000,
      deliveryTime: 25,
      proposalMessage: 'I can build your e-commerce site with React and Razorpay integration.',
      portfolioLink: 'https://portfolio.com',
      status: 'accepted'
    });

    // Sample Payments (for payment test)
    const payment1 = await Payment.create({
      projectId: project1._id,
      projectTitle: project1.title,
      clientId: client._id,
      freelancerId: freelancer._id,
      freelancerName: 'Jane Doe',
      amount: 20000,
      platformFee: 2000,
      paymentMethod: 'Credit Card',
      status: 'Pending',
      razorpayOrderId: 'order_MOCK123',
      transactionId: 'pay_MOCK456'
    });

    // Sample Messages
    await Message.create({
      senderId: freelancer._id,
      receiverId: client._id,
      projectId: project1._id,
      content: 'Hi John, ready for payment milestone.',
      isRead: false
    });

    // Sample Reviews
    await Review.create({
      reviewerId: client._id,
      reviewerName: 'John Smith',
      revieweeId: freelancer._id,
      revieweeName: 'Jane Doe',
      projectId: project1._id,
      rating: 5,
      comment: 'Excellent work!'
    });

    console.log('✅ Database seeded successfully!');
    console.log('Test accounts:');
    console.log('Client: client@test.com / 123456');
    console.log('Freelancer: freelancer@test.com / 123456');
    console.log('Admin: admin@test.com / 123456');
    console.log('Test Payment project ready - login as client to pay!');

  } catch (error) {
    console.error('Seed error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

seedData();

