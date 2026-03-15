import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService, BackendProject, BackendProposal } from '../../../services/project.service';
import { FreelancerFindJobsResolvedData } from '../../../resolvers/freelancer-find-jobs.resolver';
import { finalize } from 'rxjs/operators';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

interface Job {
  _id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  budget: number;
  experienceLevel: string;
  clientId: string;
  clientName: string;
  status: string;
  createdAt: string;
  postedTime: string;
  applied: boolean;
}

interface FilterState {
  categories: string[];
  budgets: string[];
  experienceLevels: string[];
}

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

interface ProposalForm {
  proposalText: string;
  bidAmount: number;
  deliveryTime: number;
  portfolioLink: string;
  file: File | null;
}

@Component({
  selector: 'app-find-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './find-jobs.component.html',
  styleUrls: ['./find-jobs.component.css']
})
export class FindJobsComponent implements OnInit {
  // Navbar
  isMobileOrTablet = false;
  isSidebarOpen = false;
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  userData: any = null;

  // Notifications
  notificationsList: NotificationItem[] = [];
  unreadBellCount = 0;

  // Jobs data
  allJobs: Job[] = [];
  filteredJobs: Job[] = [];

  // Filter state
  filters: FilterState = {
    categories: [],
    budgets: [],
    experienceLevels: []
  };

  // Filter options
  categoryOptions = [
    'Web Development',
    'Mobile Development',
    'UI/UX Design',
    'Graphic Design'
  ];

  budgetOptions = [
    { label: '₹1,000 – ₹5,000', min: 1000, max: 5000 },
    { label: '₹5,000 – ₹20,000', min: 5000, max: 20000 },
    { label: '₹20,000+', min: 20000, max: Infinity }
  ];

  experienceOptions = [
    'Beginner',
    'Intermediate',
    'Expert'
  ];

  // Saved jobs
  savedJobs: Set<string> = new Set();

  // Apply Modal
  showApplyModal = false;
  selectedJob: Job | null = null;
  proposalForm: ProposalForm = {
    proposalText: '',
    bidAmount: 0,
    deliveryTime: 0,
    portfolioLink: '',
    file: null
  };
  submitStatus = '';
  isSubmittingProposal = false;
  pendingProposalJobIds = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.updateViewportState();
    const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      const resolved = (this.route.snapshot.data['jobsData'] || { projects: [], proposals: [] }) as FreelancerFindJobsResolvedData;
      const appliedProjectIds = new Set((resolved.proposals || []).map((p: BackendProposal) => p.projectId));
      this.allJobs = (resolved.projects || []).map(project => ({
        _id: project._id,
        title: project.title,
        description: project.description.substring(0, 150) + '...',
        category: project.category,
        skills: project.skills || [],
        budget: project.budget,
        experienceLevel: project.experienceLevel,
        clientId: project.clientId,
        clientName: project.clientName,
        status: project.status,
        createdAt: project.createdAt,
        postedTime: this.getPostedTime(new Date(project.createdAt)),
        applied: appliedProjectIds.has(project._id)
      }));
      this.filteredJobs = [...this.allJobs];
      this.submitStatus = '';
      this.loadNotifications();
      this.loadUnreadCount();
    } else {
      this.router.navigate(['/login']);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  private updateViewportState(): void {
    this.isMobileOrTablet = window.innerWidth <= 1024;
    if (!this.isMobileOrTablet) {
      this.isSidebarOpen = false;
    }
  }

  loadJobs(): void {
    this.projectService.getOpenProjects().subscribe({
      next: (projects) => {
        this.allJobs = projects.map(project => ({
          _id: project._id,
          title: project.title,
          description: project.description.substring(0, 150) + '...',
          category: project.category,
          skills: project.skills || [],
          budget: project.budget,
          experienceLevel: project.experienceLevel,
          clientId: project.clientId,
          clientName: project.clientName,
          status: project.status,
          createdAt: project.createdAt,
          postedTime: this.getPostedTime(new Date(project.createdAt)),
          applied: false
        }));
        this.filteredJobs = [...this.allJobs];
        this.loadAppliedStatus();
      },
      error: (error) => {
        console.error('Error loading jobs:', error);
        this.allJobs = [];
        this.filteredJobs = [];
        this.submitStatus = 'Unable to load jobs from server.';
      }
    });
  }

  loadAppliedStatus(): void {
    const freelancerId = this.userData?.id || this.userData?._id;
    if (freelancerId) {
      this.projectService.getFreelancerProposals(freelancerId).subscribe({
        next: (proposals: BackendProposal[]) => {
          const appliedProjectIds = proposals.map((p: BackendProposal) => p.projectId);
          this.allJobs = this.allJobs.map(job => ({
            ...job,
            applied: appliedProjectIds.includes(job._id)
          }));
          this.filteredJobs = [...this.allJobs];
        },
        error: (error: any) => console.error('Error loading proposals:', error)
      });
    }
  }

  openApplyModal(job: Job): void {
    if (job.applied || this.pendingProposalJobIds.has(job._id)) {
      return;
    }
    this.selectedJob = job;
    this.proposalForm = {
      proposalText: '',
      bidAmount: job.budget * 0.8, // Suggest 80% of budget
      deliveryTime: 30,
      portfolioLink: '',
      file: null
    };
    this.submitStatus = '';
    this.showApplyModal = true;
  }

  closeApplyModal(): void {
    if (this.isSubmittingProposal) {
      return;
    }
    this.showApplyModal = false;
    this.selectedJob = null;
  }

  submitProposal(): void {
    if (this.isSubmittingProposal || !this.selectedJob || !this.validateForm()) return;

    const targetJobId = this.selectedJob._id;
    if (this.pendingProposalJobIds.has(targetJobId)) {
      return;
    }

    const proposalData = {
      projectId: targetJobId,
      projectTitle: this.selectedJob.title,
      proposedBudget: this.proposalForm.bidAmount,
      deliveryTime: this.proposalForm.deliveryTime,
      proposalMessage: this.proposalForm.proposalText,
      portfolioLink: this.proposalForm.portfolioLink || ''
    };

    // Optimistic UX: close form and show applied state instantly on first click.
    this.pendingProposalJobIds.add(targetJobId);
    this.markJobAsApplied(targetJobId);
    this.showApplyModal = false;
    this.selectedJob = null;
    this.proposalForm = {
      proposalText: '',
      bidAmount: 0,
      deliveryTime: 0,
      portfolioLink: '',
      file: null
    };
    this.submitStatus = '';

    this.projectService.createProposal(proposalData).pipe(
      finalize(() => {
        this.pendingProposalJobIds.delete(targetJobId);
      })
    ).subscribe({
      next: (response) => {
        if (!response.success) {
          this.setJobAppliedState(targetJobId, false);
          alert('Proposal could not be submitted. Please try again.');
        }
      },
      error: (error) => {
        this.setJobAppliedState(targetJobId, false);
        alert('Error submitting proposal. Please try again.');
      }
    });
  }

  private markJobAsApplied(jobId: string): void {
    this.setJobAppliedState(jobId, true);
  }

  private setJobAppliedState(jobId: string, applied: boolean): void {
    this.allJobs = this.allJobs.map((job) =>
      job._id === jobId ? { ...job, applied } : job
    );
    this.filteredJobs = this.filteredJobs.map((job) =>
      job._id === jobId ? { ...job, applied } : job
    );
  }

  validateForm(): boolean {
    if (!this.proposalForm.proposalText.trim()) {
      this.submitStatus = 'Proposal message is required';
      return false;
    }
    if (this.proposalForm.bidAmount <= 0) {
      this.submitStatus = 'Bid amount must be greater than 0';
      return false;
    }
    if (this.proposalForm.deliveryTime <= 0) {
      this.submitStatus = 'Delivery time must be greater than 0 days';
      return false;
    }
    this.submitStatus = '';
    return true;
  }

  getPostedTime(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }

  searchJobs(): void {
    this.applyFilters();
  }

  toggleCategory(category: string): void {
    const index = this.filters.categories.indexOf(category);
    if (index > -1) {
      this.filters.categories.splice(index, 1);
    } else {
      this.filters.categories.push(category);
    }
    this.applyFilters();
  }

  toggleBudget(budget: string): void {
    const index = this.filters.budgets.indexOf(budget);
    if (index > -1) {
      this.filters.budgets.splice(index, 1);
    } else {
      this.filters.budgets.push(budget);
    }
    this.applyFilters();
  }

  toggleExperience(level: string): void {
    const index = this.filters.experienceLevels.indexOf(level);
    if (index > -1) {
      this.filters.experienceLevels.splice(index, 1);
    } else {
      this.filters.experienceLevels.push(level);
    }
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredJobs = this.allJobs.filter(job => {
      // Search filter
      if (this.searchQuery) {
        const searchLower = this.searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(searchLower);
        const matchesSkills = job.skills.some(s => s.toLowerCase().includes(searchLower));
        const matchesDescription = job.description.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesSkills && !matchesDescription) {
          return false;
        }
      }

      // Category filter
      if (this.filters.categories.length > 0) {
        if (!this.filters.categories.includes(job.category)) {
          return false;
        }
      }

      // Budget filter
      if (this.filters.budgets.length > 0) {
        const matchesBudget = this.filters.budgets.some(budgetLabel => {
          const budgetOption = this.budgetOptions.find(b => b.label === budgetLabel);
          if (budgetOption) {
            return job.budget >= budgetOption.min && job.budget <= budgetOption.max;
          }
          return false;
        });
        if (!matchesBudget) {
          return false;
        }
      }

      // Experience level filter
      if (this.filters.experienceLevels.length > 0) {
        if (!this.filters.experienceLevels.includes(job.experienceLevel)) {
          return false;
        }
      }

      return true;
    });
  }

  isCategorySelected(category: string): boolean {
    return this.filters.categories.includes(category);
  }

  isBudgetSelected(budget: string): boolean {
    return this.filters.budgets.includes(budget);
  }

  isExperienceSelected(level: string): boolean {
    return this.filters.experienceLevels.includes(level);
  }

  toggleSaveJob(jobId: string): void {
    if (this.savedJobs.has(jobId)) {
      this.savedJobs.delete(jobId);
    } else {
      this.savedJobs.add(jobId);
    }
  }

  isJobSaved(jobId: string): boolean {
    return this.savedJobs.has(jobId);
  }

  // Navbar methods
  toggleSidebar(event?: Event): void {
    event?.stopPropagation();
    if (!this.isMobileOrTablet) {
      return;
    }
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    if (this.isMobileOrTablet) {
      this.isSidebarOpen = false;
    }
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper') && !target.closest('.profile-wrapper')) {
      this.showNotifications = false;
      this.showProfileMenu = false;
    }
    if (this.isMobileOrTablet && this.isSidebarOpen && !target.closest('.sidebar') && !target.closest('.hamburger-btn')) {
      this.isSidebarOpen = false;
    }
  }

  search(): void {
    console.log('Searching:', this.searchQuery);
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      chat_message: 'fas fa-envelope',
      order_created: 'fas fa-shopping-cart',
      order_accepted: 'fas fa-check-circle',
      delivery_submitted: 'fas fa-upload',
      revision_requested: 'fas fa-rotate-left',
      payment_success: 'fas fa-dollar-sign',
      project_approved: 'fas fa-circle-check',
      dispute_opened: 'fas fa-gavel',
      system_alert: 'fas fa-triangle-exclamation'
    };
    return icons[type] || 'fas fa-bell';
  }

  get unreadCount(): number {
    return this.unreadBellCount;
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notificationsList = this.notificationsList.map((item) => ({ ...item, read: true }));
        this.unreadBellCount = 0;
      }
    });
  }

  onNotificationClick(notification: NotificationItem, event?: Event): void {
    event?.stopPropagation();
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          this.notificationsList = this.notificationsList.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item
          );
          this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
        }
      });
    }

    if (notification.actionUrl) {
      this.showNotifications = false;
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  deleteNotification(notification: NotificationItem, event?: Event): void {
    event?.stopPropagation();
    this.notificationService.archiveNotification(notification.id).subscribe({
      next: () => {
        const wasUnread = !notification.read;
        this.notificationsList = this.notificationsList.filter((item) => item.id !== notification.id);
        if (wasUnread) {
          this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
        }
      }
    });
  }

  logout(): void {
    this.closeSidebar();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.showProfileMenu = false;
    this.closeSidebar();
    this.router.navigate(['/freelancer-profile']);
  }

  goToSettings(): void {
    this.showProfileMenu = false;
    this.closeSidebar();
    this.router.navigate(['/freelancer-settings']);
  }

  goToDashboard(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-dashboard']);
  }

  goToMessages(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-messages']);
  }

  goToMyGigs(): void {
    this.closeSidebar();
    this.router.navigate(['/my-gigs']);
  }

  goToProjects(): void {
    this.closeSidebar();
    this.router.navigate(['/my-projects']);
  }

  goToEarnings(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-earnings']);
  }

  private loadNotifications(): void {
    this.notificationService.getMyNotifications(20, 1).subscribe({
      next: (res) => {
        this.notificationsList = (res?.notifications || []).map((item: BackendNotification) => ({
          id: String(item.id),
          type: item.type,
          message: item.message || item.title || 'New update',
          time: this.toRelativeTime(item.createdAt),
          read: !!item.isRead,
          actionUrl: item.actionUrl || ''
        }));
        this.unreadBellCount = Number(res?.unreadCount || 0);
      }
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => {
        this.unreadBellCount = Number(res?.unreadCount || 0);
      }
    });
  }

  private toRelativeTime(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }
}

