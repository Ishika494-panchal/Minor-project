// Mock data service to simulate backend responses
// This allows the frontend to work without a backend server

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'freelancer' | 'client' | 'admin';
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface DashboardStats {
  activeProjects?: number;
  completedProjects?: number;
  totalEarnings?: number;
  totalSpent?: number;
  activeFreelancers?: number;
  rating?: number;
  totalUsers?: number;
  totalRevenue?: number;
  pendingApprovals?: number;
}

export interface DashboardResponse {
  success: boolean;
  stats: DashboardStats;
  recentProjects?: any[];
  recentActivities?: any[];
}

// Mock users stored in localStorage
const USERS_KEY = 'mock_users';

// Initialize mock users with a default test user
function getMockUsers(): User[] {
  let users = localStorage.getItem(USERS_KEY);
  let userList: User[] = users ? JSON.parse(users) : [];
  
  // Ensure admin user always exists
  const adminExists = userList.some(u => u.email === 'admin@skillzyy.com');
  if (!adminExists) {
    const adminUser: User = {
      id: 'test-admin-1',
      fullName: 'Admin User',
      email: 'admin@skillzyy.com',
      role: 'admin'
    };
    userList.push(adminUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(userList));
    
    // Update passwords
    const passwords = JSON.parse(localStorage.getItem('mock_passwords') || '{}');
    passwords['admin@skillzyy.com'] = 'admin123';
    localStorage.setItem('mock_passwords', JSON.stringify(passwords));
  }
  
  return userList;
}

function saveMockUser(user: User, password: string): void {
  const users = getMockUsers();
  const existingIndex = users.findIndex(u => u.email === user.email);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Store password (in real app, this would be hashed)
  const passwords = JSON.parse(localStorage.getItem('mock_passwords') || '{}');
  passwords[user.email] = password;
  localStorage.setItem('mock_passwords', JSON.stringify(passwords));
}

function validateCredentials(email: string, password: string): User | null {
  const users = getMockUsers();
  const passwords = JSON.parse(localStorage.getItem('mock_passwords') || '{}');
  
  const user = users.find(u => u.email === email);
  if (user && passwords[email] === password) {
    return user;
  }
  return null;
}

function generateToken(): string {
  return 'mock_token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Auth Service Methods
export function mockLogin(email: string, password: string): LoginResponse {
  const user = validateCredentials(email, password);
  
  if (user) {
    return {
      success: true,
      token: generateToken(),
      user: user
    };
  }
  
  return {
    success: false,
    message: 'Invalid email or password'
  };
}

export function mockRegister(fullName: string, email: string, password: string, role: string): RegisterResponse {
  const users = getMockUsers();
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return {
      success: false,
      message: 'Email already registered'
    };
  }
  
  const newUser: User = {
    id: generateId(),
    fullName,
    email,
    role: role as 'freelancer' | 'client'
  };
  
  saveMockUser(newUser, password);
  
  return {
    success: true,
    token: generateToken(),
    user: newUser
  };
}

// Dashboard Data
export function mockFreelancerDashboard(): DashboardResponse {
  return {
    success: true,
    stats: {
      activeProjects: 0,
      completedProjects: 0,
      totalEarnings: 0,
      rating: 0
    },
    recentProjects: []
  };
}

export function mockClientDashboard(): DashboardResponse {
  return {
    success: true,
    stats: {
      activeProjects: 0,
      completedProjects: 0,
      totalSpent: 0,
      activeFreelancers: 0
    },
    recentProjects: []
  };
}

export function mockAdminDashboard(): DashboardResponse {
  return {
    success: true,
    stats: {
      totalUsers: 156,
      activeProjects: 42,
      totalRevenue: 125000,
      pendingApprovals: 8
    },
    recentActivities: [
      {
        action: 'New freelancer registered',
        user: 'Sarah Johnson',
        time: '2 minutes ago'
      },
      {
        action: 'Project completed',
        user: 'E-commerce Website',
        time: '1 hour ago'
      },
      {
        action: 'New client registered',
        user: 'TechCorp Solutions',
        time: '3 hours ago'
      },
      {
        action: 'Payment received',
        user: '₹5,000',
        time: '5 hours ago'
      },
      {
        action: 'Freelancer verification pending',
        user: 'Michael Chen',
        time: '1 day ago'
      }
    ]
  };
}

// Admin Dashboard Data Functions
export function getAdminStats(): DashboardStats {
  const stored = localStorage.getItem('admin_stats');
  if (stored) {
    return JSON.parse(stored);
  }
  // Return default admin stats
  return {
    totalUsers: 156,
    activeProjects: 42,
    totalRevenue: 125000,
    pendingApprovals: 8
  };
}

export function getAdminRecentActivities(): any[] {
  const stored = localStorage.getItem('admin_recent_activities');
  if (stored) {
    return JSON.parse(stored);
  }
  // Return default recent activities
  return [
    {
      action: 'New freelancer registered',
      user: 'Sarah Johnson',
      time: '2 minutes ago'
    },
    {
      action: 'Project completed',
      user: 'E-commerce Website',
      time: '1 hour ago'
    },
    {
      action: 'New client registered',
      user: 'TechCorp Solutions',
      time: '3 hours ago'
    },
    {
      action: 'Payment received',
      user: '₹5,000',
      time: '5 hours ago'
    },
    {
      action: 'Freelancer verification pending',
      user: 'Michael Chen',
      time: '1 day ago'
    }
  ];
}

// Payment Interfaces
export interface Payment {
  id: string;
  projectTitle: string;
  freelancerName: string;
  amount: number;
  paymentMethod: string;
  date: Date;
  status: 'Pending' | 'Completed';
}

export interface PaymentSummary {
  totalSpent: number;
  pendingPayments: number;
  completedPayments: number;
}

// Mock Payment Data
export function getMockPayments(): Payment[] {
  const payments = localStorage.getItem('mock_payments');
  if (payments) {
    return JSON.parse(payments);
  }
  // Return empty array - data will come from backend API
  return [];
}

export function getPaymentSummary(): PaymentSummary {
  const payments = getMockPayments();
  const completedPayments = payments.filter(p => p.status === 'Completed');
  const pendingPayments = payments.filter(p => p.status === 'Pending');
  
  return {
    totalSpent: completedPayments.reduce((sum, p) => sum + p.amount, 0),
    pendingPayments: pendingPayments.length,
    completedPayments: completedPayments.length
  };
}

export function updatePaymentStatus(paymentId: string, newStatus: 'Pending' | 'Completed'): boolean {
  const payments = getMockPayments();
  const paymentIndex = payments.findIndex(p => p.id === paymentId);
  
  if (paymentIndex >= 0) {
    payments[paymentIndex].status = newStatus;
    localStorage.setItem('mock_payments', JSON.stringify(payments));
    return true;
  }
  return false;
}

// Get payment history (completed payments only)
export function getMockPaymentHistory(): Payment[] {
  const history = localStorage.getItem('mock_payment_history');
  if (history) {
    return JSON.parse(history);
  }
  // Return empty array - data will come from backend API
  return [];
}

// Client Profile Interface
export interface ClientProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  profilePicture: string;
  bio: string;
  companyName: string;
  industry: string;
  website: string;
  memberSince: string;
  totalProjectsPosted: number;
  totalFreelancersHired: number;
}

// Mock Client Profile Data
export function getMockClientProfile(): ClientProfile {
  const profile = localStorage.getItem('mock_client_profile');
  if (profile) {
    return JSON.parse(profile);
  }
  // Return default mock data
  return {
    id: '1',
    fullName: 'John Anderson',
    email: 'john.anderson@techcorp.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA, USA',
    profilePicture: 'assets/client.jpeg',
    bio: 'TechCorp Solutions is a leading software development company specializing in web and mobile applications. We are always looking for talented freelancers to help bring our innovative ideas to life.',
    companyName: 'TechCorp Solutions',
    industry: 'Technology & Software Development',
    website: 'https://www.techcorp-solutions.com',
    memberSince: 'January 2023',
    totalProjectsPosted: 15,
    totalFreelancersHired: 8
  };
}

export function saveMockClientProfile(profile: ClientProfile): void {
  localStorage.setItem('mock_client_profile', JSON.stringify(profile));
}

// Freelancer Interfaces
export interface Freelancer {
  id: string;
  fullName: string;
  email: string;
  profilePicture: string;
  skills: string[];
  category: string;
  bio: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  completedProjects: number;
  memberSince: string;
  languages: string[];
  portfolio: string[];
}

// Filter options
export interface FilterOptions {
  search: string;
  category: string;
  minRating: number;
  minPrice: number;
  maxPrice: number;
}

// Get freelancers from backend API - returns empty array for now
export function getMockFreelancers(): Freelancer[] {
  const freelancers = localStorage.getItem('mock_freelancers');
  if (freelancers) {
    return JSON.parse(freelancers);
  }
  // No mock data - returns empty array (connect to backend API)
  return [];
}

export function getFreelancerById(id: string): Freelancer | null {
  const freelancers = getMockFreelancers();
  return freelancers.find(f => f.id === id) || null;
}

export function filterFreelancers(freelancers: Freelancer[], filters: FilterOptions): Freelancer[] {
  return freelancers.filter(freelancer => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = freelancer.fullName.toLowerCase().includes(searchLower);
      const matchesSkills = freelancer.skills.some(s => s.toLowerCase().includes(searchLower));
      const matchesCategory = freelancer.category.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesSkills && !matchesCategory) {
        return false;
      }
    }
    
    // Category filter
    if (filters.category && filters.category !== 'All') {
      if (freelancer.category !== filters.category) {
        return false;
      }
    }
    
    // Rating filter
    if (filters.minRating > 0) {
      if (freelancer.rating < filters.minRating) {
        return false;
      }
    }
    
    // Price range filter
    if (filters.minPrice > 0) {
      if (freelancer.hourlyRate < filters.minPrice) {
        return false;
      }
    }
    
    if (filters.maxPrice > 0) {
      if (freelancer.hourlyRate > filters.maxPrice) {
        return false;
      }
    }
    
    return true;
  });
}

// Get unique categories
export function getFreelancerCategories(): string[] {
  const freelancers = getMockFreelancers();
  const categories = freelancers.map(f => f.category);
  return ['All', ...new Set(categories)];
}

// ==========================================
// PROJECT INTERFACES AND MOCK DATA
// ==========================================

export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  budget: number;
  deadline: string;
  experienceLevel: 'Beginner' | 'Intermediate' | 'Expert';
  projectType: 'Fixed Price' | 'Hourly';
  attachments: string[];
  allowProposals: boolean;
  clientId: string;
  clientName: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: Date;
}

// Get projects from localStorage
export function getMockProjects(): Project[] {
  const projects = localStorage.getItem('mock_projects');
  if (projects) {
    return JSON.parse(projects);
  }
  // Return sample mock projects for demo
  return [
    {
      id: '1',
      title: 'E-commerce Website Development',
      description: 'Looking for an experienced developer to build a full-featured e-commerce website with payment integration.',
      category: 'Web Development',
      skills: ['React', 'Node.js', 'MongoDB', 'Stripe'],
      budget: 5000,
      deadline: '2024-03-15',
      experienceLevel: 'Expert',
      projectType: 'Fixed Price',
      attachments: ['requirements.pdf'],
      allowProposals: true,
      clientId: '1',
      clientName: 'John Anderson',
      status: 'Open',
      createdAt: new Date('2024-01-15')
    },
    {
      id: '2',
      title: 'Mobile App UI Design',
      description: 'Need a talented designer to create modern UI/UX designs for our fitness tracking mobile app.',
      category: 'UI/UX Design',
      skills: ['Figma', 'Mobile Design', 'Prototyping'],
      budget: 1500,
      deadline: '2024-02-28',
      experienceLevel: 'Intermediate',
      projectType: 'Fixed Price',
      attachments: [],
      allowProposals: true,
      clientId: '1',
      clientName: 'John Anderson',
      status: 'Open',
      createdAt: new Date('2024-01-20')
    }
  ];
}

export function getMockProjectsByClientId(clientId: string): Project[] {
  const projects = getMockProjects();
  return projects.filter(p => p.clientId === clientId);
}

export function getProjectById(id: string): Project | null {
  const projects = getMockProjects();
  return projects.find(p => p.id === id) || null;
}

export function saveMockProject(project: Project): void {
  const projects = getMockProjects();
  const existingIndex = projects.findIndex(p => p.id === project.id);
  
  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  
  localStorage.setItem('mock_projects', JSON.stringify(projects));
}

// Generate a new project ID
export function generateProjectId(): string {
  return 'proj_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Get project categories
export const PROJECT_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Graphic Design',
  'Content Writing',
  'Digital Marketing',
  'Video Editing',
  'Data Entry',
  'Virtual Assistant',
  'Other'
];

// Get common skills
export const COMMON_SKILLS = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'Angular', 'React', 'Vue.js',
  'Node.js', 'Express', 'MongoDB', 'Python', 'Django', 'Flask', 'Java',
  'Spring', 'PHP', 'Laravel', 'Ruby on Rails', 'SQL', 'MySQL', 'PostgreSQL',
  'AWS', 'Docker', 'Kubernetes', 'Git', 'Figma', 'Adobe XD', 'Photoshop',
  'Illustrator', 'Video Editing', 'SEO', 'Content Writing', 'WordPress'
];

// ==========================================
// PROPOSAL INTERFACES AND MOCK DATA
// ==========================================

export interface Proposal {
  id: string;
  projectId: string;
  projectTitle: string;
  freelancerId: string;
  freelancerName: string;
  freelancerProfilePicture: string;
  rating: number;
  proposedBudget: number;
  deliveryTime: number; // in days
  proposalMessage: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: Date;
}

// Get proposals from localStorage
export function getMockProposals(): Proposal[] {
  const proposals = localStorage.getItem('mock_proposals');
  if (proposals) {
    return JSON.parse(proposals);
  }
  // Return sample mock proposals for demo
  return [
    {
      id: 'prop_1',
      projectId: '1',
      projectTitle: 'E-commerce Website Development',
      freelancerId: 'f1',
      freelancerName: 'Sarah Johnson',
      freelancerProfilePicture: 'assets/client.jpeg',
      rating: 4.8,
      proposedBudget: 4500,
      deliveryTime: 30,
      proposalMessage: 'I am an experienced full-stack developer with 5+ years of experience in React, Node.js, and MongoDB. I can build a complete e-commerce website with payment integration, admin panel, and inventory management system.',
      status: 'Pending',
      createdAt: new Date('2024-01-16')
    },
    {
      id: 'prop_2',
      projectId: '1',
      projectTitle: 'E-commerce Website Development',
      freelancerId: 'f2',
      freelancerName: 'Michael Chen',
      freelancerProfilePicture: 'assets/client.jpeg',
      rating: 4.5,
      proposedBudget: 5000,
      deliveryTime: 25,
      proposalMessage: 'I specialize in building scalable e-commerce solutions using MERN stack. I have completed similar projects and can deliver a high-quality solution within your deadline.',
      status: 'Pending',
      createdAt: new Date('2024-01-17')
    },
    {
      id: 'prop_3',
      projectId: '1',
      projectTitle: 'E-commerce Website Development',
      freelancerId: 'f3',
      freelancerName: 'Emily Davis',
      freelancerProfilePicture: 'assets/client.jpeg',
      rating: 4.9,
      proposedBudget: 5500,
      deliveryTime: 20,
      proposalMessage: 'As a senior web developer, I have extensive experience in building e-commerce platforms. I will provide a secure, fast, and user-friendly solution.',
      status: 'Pending',
      createdAt: new Date('2024-01-18')
    },
    {
      id: 'prop_4',
      projectId: '2',
      projectTitle: 'Mobile App UI Design',
      freelancerId: 'f4',
      freelancerName: 'Alex Rivera',
      freelancerProfilePicture: 'assets/client.jpeg',
      rating: 4.7,
      proposedBudget: 1200,
      deliveryTime: 14,
      proposalMessage: 'I am a UI/UX designer specialized in mobile app design. I will create modern, intuitive designs using Figma that will engage your users.',
      status: 'Pending',
      createdAt: new Date('2024-01-21')
    },
    {
      id: 'prop_5',
      projectId: '2',
      projectTitle: 'Mobile App UI Design',
      freelancerId: 'f5',
      freelancerName: 'Jessica Wong',
      freelancerProfilePicture: 'assets/client.jpeg',
      rating: 4.6,
      proposedBudget: 1500,
      deliveryTime: 10,
      proposalMessage: 'With 4 years of experience in mobile UI/UX design, I can deliver stunning designs for your fitness app. I specialize in clean, modern interfaces.',
      status: 'Pending',
      createdAt: new Date('2024-01-22')
    }
  ];
}

export function getProposalsByProjectId(projectId: string): Proposal[] {
  const proposals = getMockProposals();
  return proposals.filter(p => p.projectId === projectId);
}

export function getProposalById(id: string): Proposal | null {
  const proposals = getMockProposals();
  return proposals.find(p => p.id === id) || null;
}

export function updateProposalStatus(proposalId: string, newStatus: 'Pending' | 'Accepted' | 'Rejected'): boolean {
  const proposals = getMockProposals();
  const proposalIndex = proposals.findIndex(p => p.id === proposalId);
  
  if (proposalIndex >= 0) {
    proposals[proposalIndex].status = newStatus;
    localStorage.setItem('mock_proposals', JSON.stringify(proposals));
    return true;
  }
  return false;
}

// ==========================================
// REVENUE INTERFACES AND MOCK DATA
// ==========================================

export interface Transaction {
  id: string;
  clientName: string;
  freelancerName: string;
  projectTitle: string;
  amount: number;
  commission: number;
  paymentMethod: string;
  status: 'Completed' | 'Pending' | 'Refunded';
  date: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueThisWeek: number;
  platformCommission: number;
  pendingPayments: number;
}

// Get mock transactions for admin revenue
export function getMockTransactions(): Transaction[] {
  const transactions = localStorage.getItem('mock_transactions');
  if (transactions) {
    return JSON.parse(transactions);
  }
  
  // Return sample mock transactions
  return [
    {
      id: 'TXN001',
      clientName: 'Rahul Sharma',
      freelancerName: 'Sarah Johnson',
      projectTitle: 'E-commerce Website',
      amount: 15000,
      commission: 1500,
      paymentMethod: 'Credit Card',
      status: 'Completed',
      date: '2024-03-15'
    },
    {
      id: 'TXN002',
      clientName: 'Priya Patel',
      freelancerName: 'Michael Chen',
      projectTitle: 'Mobile App Design',
      amount: 8500,
      commission: 850,
      paymentMethod: 'UPI',
      status: 'Completed',
      date: '2024-03-14'
    },
    {
      id: 'TXN003',
      clientName: 'TechCorp Solutions',
      freelancerName: 'Emily Davis',
      projectTitle: 'Brand Logo Design',
      amount: 5000,
      commission: 500,
      paymentMethod: 'Bank Transfer',
      status: 'Completed',
      date: '2024-03-13'
    },
    {
      id: 'TXN004',
      clientName: 'Neha Verma',
      freelancerName: 'Alex Rivera',
      projectTitle: 'SEO Optimization',
      amount: 3000,
      commission: 300,
      paymentMethod: 'PayPal',
      status: 'Pending',
      date: '2024-03-12'
    },
    {
      id: 'TXN005',
      clientName: 'John Anderson',
      freelancerName: 'Jessica Wong',
      projectTitle: 'WordPress Website',
      amount: 8000,
      commission: 800,
      paymentMethod: 'Debit Card',
      status: 'Completed',
      date: '2024-03-11'
    },
    {
      id: 'TXN006',
      clientName: 'Ankit Gupta',
      freelancerName: 'David Lee',
      projectTitle: 'React Native App',
      amount: 25000,
      commission: 2500,
      paymentMethod: 'Credit Card',
      status: 'Completed',
      date: '2024-03-10'
    },
    {
      id: 'TXN007',
      clientName: 'Sneha Reddy',
      freelancerName: 'Maria Garcia',
      projectTitle: 'Content Writing',
      amount: 2000,
      commission: 200,
      paymentMethod: 'UPI',
      status: 'Refunded',
      date: '2024-03-09'
    },
    {
      id: 'TXN008',
      clientName: 'Kumar Industries',
      freelancerName: 'James Wilson',
      projectTitle: 'Corporate Website',
      amount: 18000,
      commission: 1800,
      paymentMethod: 'Bank Transfer',
      status: 'Completed',
      date: '2024-03-08'
    },
    {
      id: 'TXN009',
      clientName: 'Riya Singh',
      freelancerName: 'Robert Brown',
      projectTitle: 'Social Media Graphics',
      amount: 3500,
      commission: 350,
      paymentMethod: 'PayPal',
      status: 'Pending',
      date: '2024-03-07'
    },
    {
      id: 'TXN010',
      clientName: 'Amit Kumar',
      freelancerName: 'Lisa Anderson',
      projectTitle: 'Data Analysis',
      amount: 12000,
      commission: 1200,
      paymentMethod: 'Credit Card',
      status: 'Completed',
      date: '2024-03-06'
    },
    {
      id: 'TXN011',
      clientName: 'Pooja Shah',
      freelancerName: 'Kevin Martin',
      projectTitle: 'Video Editing',
      amount: 6000,
      commission: 600,
      paymentMethod: 'Debit Card',
      status: 'Completed',
      date: '2024-03-05'
    },
    {
      id: 'TXN012',
      clientName: 'Vikram Associates',
      freelancerName: 'Anna Taylor',
      projectTitle: 'UI/UX Redesign',
      amount: 10000,
      commission: 1000,
      paymentMethod: 'Bank Transfer',
      status: 'Completed',
      date: '2024-03-04'
    }
  ];
}

// Get revenue summary
export function getRevenueSummary(): RevenueSummary {
  const transactions = getMockTransactions();
  
  const completedTransactions = transactions.filter(t => t.status === 'Completed');
  const pendingTransactions = transactions.filter(t => t.status === 'Pending');
  
  const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
  const platformCommission = completedTransactions.reduce((sum, t) => sum + t.commission, 0);
  
  // Calculate this month's revenue
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const thisMonthTransactions = completedTransactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });
  
  const revenueThisMonth = thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate this week's revenue
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const thisWeekTransactions = completedTransactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= startOfWeek;
  });
  
  const revenueThisWeek = thisWeekTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  return {
    totalRevenue,
    revenueThisMonth,
    revenueThisWeek,
    platformCommission,
    pendingPayments: pendingTransactions.reduce((sum, t) => sum + t.amount, 0)
  };
}

// ==========================================
// APPROVAL REQUEST INTERFACES AND MOCK DATA
// ==========================================

export interface ApprovalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestType: 'Freelancer Verification' | 'New Project' | 'Withdrawal';
  description: string;
  details: any;
  submittedDate: Date;
  status: 'Pending' | 'Approved' | 'Rejected';
  amount?: number;
}

// Get approval requests from localStorage
export function getMockApprovalRequests(): ApprovalRequest[] {
  const requests = localStorage.getItem('mock_approval_requests');
  if (requests) {
    return JSON.parse(requests);
  }
  
  // Return sample mock approval requests
  return [
    {
      id: 'APR001',
      userId: 'U1023',
      userName: 'Rahul Sharma',
      userEmail: 'rahul@gmail.com',
      requestType: 'Freelancer Verification',
      description: 'Profile verification request for freelancer account',
      details: {
        skills: ['JavaScript', 'React', 'Node.js'],
        portfolio: 'https://portfolio.rahul.dev',
        experience: '3 years',
        rating: 4.8
      },
      submittedDate: new Date('2024-03-15'),
      status: 'Pending'
    },
    {
      id: 'APR002',
      userId: 'U1024',
      userName: 'Priya Patel',
      userEmail: 'priya@gmail.com',
      requestType: 'New Project',
      description: 'New project posting for E-commerce Website',
      details: {
        projectTitle: 'E-commerce Website Development',
        budget: 5000,
        deadline: '2024-03-30',
        category: 'Web Development'
      },
      submittedDate: new Date('2024-03-14'),
      status: 'Pending'
    },
    {
      id: 'APR003',
      userId: 'U1026',
      userName: 'Neha Verma',
      userEmail: 'neha@gmail.com',
      requestType: 'Withdrawal',
      description: 'Withdrawal request for earned amount',
      details: {
        bankName: 'HDFC Bank',
        accountNumber: '****4567',
        ifscCode: 'HDFC0001234'
      },
      submittedDate: new Date('2024-03-13'),
      status: 'Pending',
      amount: 15000
    },
    {
      id: 'APR004',
      userId: 'U1028',
      userName: 'Sanjay Kumar',
      userEmail: 'sanjay@gmail.com',
      requestType: 'Freelancer Verification',
      description: 'Profile verification request for freelancer account',
      details: {
        skills: ['Python', 'Django', 'Machine Learning'],
        portfolio: 'https://sanjay-ai.com',
        experience: '5 years',
        rating: 4.9
      },
      submittedDate: new Date('2024-03-12'),
      status: 'Pending'
    },
    {
      id: 'APR005',
      userId: 'U1030',
      userName: 'Vikram Malhotra',
      userEmail: 'vikram@gmail.com',
      requestType: 'New Project',
      description: 'New project posting for Mobile App',
      details: {
        projectTitle: 'Fitness Tracking Mobile App',
        budget: 8000,
        deadline: '2024-04-15',
        category: 'Mobile Development'
      },
      submittedDate: new Date('2024-03-11'),
      status: 'Pending'
    },
    {
      id: 'APR006',
      userId: 'U1032',
      userName: 'Arjun Kapoor',
      userEmail: 'arjun@gmail.com',
      requestType: 'Withdrawal',
      description: 'Withdrawal request for earned amount',
      details: {
        bankName: 'ICICI Bank',
        accountNumber: '****8901',
        ifscCode: 'ICICI0005678'
      },
      submittedDate: new Date('2024-03-10'),
      status: 'Pending',
      amount: 25000
    },
    {
      id: 'APR007',
      userId: 'U1034',
      userName: 'Kunal Patel',
      userEmail: 'kunal@gmail.com',
      requestType: 'Freelancer Verification',
      description: 'Profile verification request for freelancer account',
      details: {
        skills: ['UI/UX Design', 'Figma', 'Adobe XD'],
        portfolio: 'https://kunal.design',
        experience: '4 years',
        rating: 4.7
      },
      submittedDate: new Date('2024-03-09'),
      status: 'Pending'
    },
    {
      id: 'APR008',
      userId: 'U1029',
      userName: 'Anjali Singh',
      userEmail: 'anjali@gmail.com',
      requestType: 'New Project',
      description: 'New project posting for Logo Design',
      details: {
        projectTitle: 'Brand Logo Design',
        budget: 1500,
        deadline: '2024-03-25',
        category: 'Graphic Design'
      },
      submittedDate: new Date('2024-03-08'),
      status: 'Pending'
    }
  ];
}

export function getPendingApprovalRequests(): ApprovalRequest[] {
  const requests = getMockApprovalRequests();
  return requests.filter(r => r.status === 'Pending');
}

export function getApprovalRequestById(id: string): ApprovalRequest | null {
  const requests = getMockApprovalRequests();
  return requests.find(r => r.id === id) || null;
}

export function updateApprovalRequestStatus(requestId: string, newStatus: 'Approved' | 'Rejected'): boolean {
  const requests = getMockApprovalRequests();
  const requestIndex = requests.findIndex(r => r.id === requestId);
  
  if (requestIndex >= 0) {
    requests[requestIndex].status = newStatus;
    localStorage.setItem('mock_approval_requests', JSON.stringify(requests));
    
    // Update admin stats
    const adminStats = getAdminStats();
    adminStats.pendingApprovals = getPendingApprovalRequests().length;
    localStorage.setItem('admin_stats', JSON.stringify(adminStats));
    
    return true;
  }
  return false;
}

// Get monthly revenue data for chart
export function getMonthlyRevenue(): { month: string; amount: number }[] {
  const transactions = getMockTransactions();
  const completedTransactions = transactions.filter(t => t.status === 'Completed');
  
  // Group by month
  const monthlyData: { [key: string]: number } = {};
  
  completedTransactions.forEach(t => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0;
    }
    monthlyData[monthKey] += t.amount;
  });
  
  // Convert to array and sort by month
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const result = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, amount]) => {
      const [year, month] = monthKey.split('-');
      return {
        month: monthNames[parseInt(month) - 1] + ' ' + year.slice(2),
        amount
      };
    });
  
  // If no data, return sample data
  if (result.length === 0) {
    return [
      { month: 'Oct 23', amount: 45000 },
      { month: 'Nov 23', amount: 52000 },
      { month: 'Dec 23', amount: 48000 },
      { month: 'Jan 24', amount: 61000 },
      { month: 'Feb 24', amount: 55000 },
      { month: 'Mar 24', amount: 72000 }
    ];
  }
  
  return result;
}

// ==========================================
// REPORT INTERFACES AND MOCK DATA
// ==========================================

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUserEmail: string;
  issueType: 'Fraud' | 'Inappropriate Behavior' | 'Payment Dispute' | 'Harassment' | 'Spam' | 'Other';
  description: string;
  evidence: string[];
  date: Date;
  status: 'Open' | 'Under Review' | 'Resolved';
  resolution?: string;
  resolvedBy?: string;
  resolvedDate?: Date;
}

// Get mock reports from localStorage
export function getMockReports(): Report[] {
  const reports = localStorage.getItem('mock_reports');
  if (reports) {
    return JSON.parse(reports);
  }
  
  // Return sample mock reports
  return [
    {
      id: 'RPT001',
      reporterId: 'U1001',
      reporterName: 'Sarah Johnson',
      reporterEmail: 'sarah.j@email.com',
      reportedUserId: 'U2001',
      reportedUserName: 'Mike Thompson',
      reportedUserEmail: 'mike.t@email.com',
      issueType: 'Fraud',
      description: 'This user promised to deliver a project but never completed the work and refused to refund the advance payment of ₹10,000.',
      evidence: ['chat_screenshot_1.png', 'payment_receipt.pdf'],
      date: new Date('2024-03-15'),
      status: 'Open'
    },
    {
      id: 'RPT002',
      reporterId: 'U1002',
      reporterName: 'Emily Davis',
      reporterEmail: 'emily.d@email.com',
      reportedUserId: 'U2002',
      reportedUserName: 'John Smith',
      reportedUserEmail: 'john.s@email.com',
      issueType: 'Inappropriate Behavior',
      description: 'The freelancer used offensive language and made inappropriate comments during our project discussion.',
      evidence: ['conversation_screenshot.png'],
      date: new Date('2024-03-14'),
      status: 'Open'
    },
    {
      id: 'RPT003',
      reporterId: 'U1003',
      reporterName: 'Alex Rivera',
      reporterEmail: 'alex.r@email.com',
      reportedUserId: 'U2003',
      reportedUserName: 'TechCorp LLC',
      reportedUserEmail: 'contact@techcorp.com',
      issueType: 'Payment Dispute',
      description: 'Client refused to pay the remaining amount after the project was completed according to specifications.',
      evidence: ['project_requirements.pdf', 'completion_certificate.pdf'],
      date: new Date('2024-03-13'),
      status: 'Under Review'
    },
    {
      id: 'RPT004',
      reporterId: 'U1004',
      reporterName: 'Jessica Wong',
      reporterEmail: 'jessica.w@email.com',
      reportedUserId: 'U2004',
      reportedUserName: 'Robert Brown',
      reportedUserEmail: 'robert.b@email.com',
      issueType: 'Harassment',
      description: 'This user has been sending repeated unwanted messages even after being blocked.',
      evidence: ['message_history.pdf'],
      date: new Date('2024-03-12'),
      status: 'Open'
    },
    {
      id: 'RPT005',
      reporterId: 'U1005',
      reporterName: 'David Lee',
      reporterEmail: 'david.l@email.com',
      reportedUserId: 'U2005',
      reportedUserName: 'Anna Martinez',
      reportedUserEmail: 'anna.m@email.com',
      issueType: 'Spam',
      description: 'User is sending spam messages about pyramid schemes and fake investment opportunities.',
      evidence: ['spam_messages.pdf'],
      date: new Date('2024-03-11'),
      status: 'Resolved',
      resolution: 'Account permanently suspended for repeated spam violations.',
      resolvedBy: 'Admin User',
      resolvedDate: new Date('2024-03-14')
    },
    {
      id: 'RPT006',
      reporterId: 'U1006',
      reporterName: 'Maria Garcia',
      reporterEmail: 'maria.g@email.com',
      reportedUserId: 'U2006',
      reportedUserName: 'Chris Wilson',
      reportedUserEmail: 'chris.w@email.com',
      issueType: 'Fraud',
      description: 'Posed as a verified freelancer with fake portfolio items and credentials.',
      evidence: ['fake_portfolio.pdf'],
      date: new Date('2024-03-10'),
      status: 'Resolved',
      resolution: 'Account suspended for 30 days. User must verify identity before reactivation.',
      resolvedBy: 'Admin User',
      resolvedDate: new Date('2024-03-13')
    },
    {
      id: 'RPT007',
      reporterId: 'U1007',
      reporterName: 'Kevin Martin',
      reporterEmail: 'kevin.m@email.com',
      reportedUserId: 'U2007',
      reportedUserName: 'Lisa Anderson',
      reportedUserEmail: 'lisa.a@email.com',
      issueType: 'Payment Dispute',
      description: 'Client disputed a payment claiming the work was not as requested, but all deliverables were approved.',
      evidence: ['approved_deliverables.pdf', 'contract.pdf'],
      date: new Date('2024-03-09'),
      status: 'Open'
    },
    {
      id: 'RPT008',
      reporterId: 'U1008',
      reporterName: 'Priya Patel',
      reporterEmail: 'priya.p@email.com',
      reportedUserId: 'U2008',
      reportedUserName: 'Tom Harris',
      reportedUserEmail: 'tom.h@email.com',
      issueType: 'Inappropriate Behavior',
      description: 'Used discriminatory language based on nationality during project discussions.',
      evidence: ['chat_logs.pdf'],
      date: new Date('2024-03-08'),
      status: 'Under Review'
    }
  ];
}

export function getReportById(id: string): Report | null {
  const reports = getMockReports();
  return reports.find(r => r.id === id) || null;
}

export function updateReportStatus(reportId: string, newStatus: 'Open' | 'Under Review' | 'Resolved', resolution?: string): boolean {
  const reports = getMockReports();
  const reportIndex = reports.findIndex(r => r.id === reportId);
  
  if (reportIndex >= 0) {
    reports[reportIndex].status = newStatus;
    if (newStatus === 'Resolved' && resolution) {
      reports[reportIndex].resolution = resolution;
      reports[reportIndex].resolvedBy = 'Admin User';
      reports[reportIndex].resolvedDate = new Date();
    }
    localStorage.setItem('mock_reports', JSON.stringify(reports));
    return true;
  }
  return false;
}

export function getReportsByStatus(status: string): Report[] {
  const reports = getMockReports();
  if (status === 'All') {
    return reports;
  }
  return reports.filter(r => r.status === status);
}

export function getReportsByType(issueType: string): Report[] {
  const reports = getMockReports();
  if (issueType === 'All') {
    return reports;
  }
  return reports.filter(r => r.issueType === issueType);
}

