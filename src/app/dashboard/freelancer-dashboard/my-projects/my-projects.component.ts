import { Component, OnInit, HostListener, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService, BackendProject, BackendProposal } from '../../../services/project.service';
import { PaymentService } from '../../../services/payment.service';
import { FreelancerProjectsResolvedData } from '../../../resolvers/freelancer-projects.resolver';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

interface Project {
  _id: string;
  title: string;
  description: string;
  clientId?: string;
  clientName: string;
  budget: number;
  deadline: string; // ISO date or empty for applied items
  status: 'In Progress' | 'Submitted' | 'Completed' | 'Applied';
  submissionCodeFileName?: string;
  submissionCodeFilePath?: string;
  submissionHostedLink?: string;
  resubmissionReason?: string;
  resubmissionRequestedAt?: string | null;
}

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

@Component({
  selector: 'app-my-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-projects.component.html',
  styleUrls: ['./my-projects.component.css']
})
export class MyProjectsComponent implements OnInit {
  userData: any = null;
  isLoading = false;
  isMobileOrTablet = false;
  isSidebarOpen = false;
  
  // Navbar
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  
  projects: Project[] = [];
  selectedProject: Project | null = null;
  showProjectDetails = false;
  hostedLinkInput = '';
  submissionMessage = '';
  savingLink = false;
  submittingProjectId: string | null = null;
  private paidProjectIds = new Set<string>();
  
  // Notifications
  notificationsList: NotificationItem[] = [];
  unreadBellCount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateViewportState();
    const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      const resolvedData = (this.route.snapshot.data['projects'] || { projects: [], proposals: [] }) as FreelancerProjectsResolvedData;
      const assignedProjects = this.mapProjects(resolvedData.projects || []);
      const appliedProjects = this.mapAppliedProjects(resolvedData.proposals || [], assignedProjects);
      this.projects = [...assignedProjects, ...appliedProjects];
      this.loadPaidProjectsState();
      this.loadNotifications();
      this.loadUnreadCount();
      this.isLoading = false;
      this.cdr.detectChanges();
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

  loadProjects(): void {
    const freelancerId = this.userData?.id || this.userData?._id;
    if (!freelancerId) {
      this.projects = [];
      return;
    }

    this.isLoading = true;
    this.projectService.getFreelancerProjects(freelancerId).subscribe({
      next: (projects: BackendProject[]) => {
        this.ngZone.run(() => {
          this.projects = this.mapProjects(projects);
          this.loadPaidProjectsState();
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Error loading freelancer projects:', error);
        this.ngZone.run(() => {
          this.projects = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private mapProjects(projects: BackendProject[]): Project[] {
    return projects.map((project) => ({
      _id: project._id,
      title: project.title,
      description: project.description || '',
      clientId: project.clientId || '',
      clientName: project.clientName,
      budget: project.budget,
      deadline: project.deadline,
      status: project.status as Project['status'],
      submissionCodeFileName: project.submissionCodeFileName || '',
      submissionCodeFilePath: project.submissionCodeFilePath || '',
      submissionHostedLink: project.submissionHostedLink || '',
      resubmissionReason: project.resubmissionReason || '',
      resubmissionRequestedAt: project.resubmissionRequestedAt || null
    }));
  }

  private loadPaidProjectsState(): void {
    const freelancerId = this.userData?.id || this.userData?._id;
    if (!freelancerId) {
      return;
    }

    this.paymentService.getPayments(freelancerId, 'freelancer').subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          const payments = response?.payments || [];
          this.paidProjectIds = new Set(
            payments
              .filter((payment: any) => String(payment?.status) === 'Completed')
              .map((payment: any) => String(payment?.projectId?._id || payment?.projectId || ''))
              .filter((id: string) => !!id)
          );
          this.cdr.detectChanges();
        });
      },
      error: () => {
        // Keep UI stable even if payment API fails.
      }
    });
  }

  private mapAppliedProjects(proposals: BackendProposal[], existingProjects: Project[]): Project[] {
    const existingIds = new Set(existingProjects.map((p) => p._id));
    return proposals
      .filter((proposal) => proposal.status === 'pending')
      .filter((proposal) => !existingIds.has(proposal.projectId))
      .map((proposal) => ({
        _id: proposal.projectId,
        title: proposal.projectTitle,
        description: proposal.proposalMessage || '',
        clientId: proposal.clientId || '',
        clientName: proposal.clientName || 'Client',
        budget: proposal.proposedBudget,
        deadline: '',
        status: 'Applied',
        submissionHostedLink: ''
      }));
  }

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
    // Kept for template compatibility. Filtering is handled by `filteredProjects`.
  }

  get filteredProjects(): Project[] {
    const term = this.searchQuery.trim().toLowerCase();
    if (!term) {
      return this.projects;
    }

    return this.projects.filter((project) => {
      const searchable = [
        project.title,
        project.clientName,
        project.status,
        String(project.budget || ''),
        project.deadline ? new Date(project.deadline).toLocaleDateString() : '',
        project.resubmissionReason || ''
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }

  getStatusClass(status: string): string {
    if (status === 'Applied') {
      return 'pending';
    }
    return status.toLowerCase().replace(' ', '-');
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
        this.ngZone.run(() => {
          this.notificationsList = this.notificationsList.map((item) => ({ ...item, read: true }));
          this.unreadBellCount = 0;
          this.cdr.detectChanges();
        });
      }
    });
  }

  onNotificationClick(notification: NotificationItem, event?: Event): void {
    event?.stopPropagation();
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.notificationsList = this.notificationsList.map((item) =>
              item.id === notification.id ? { ...item, read: true } : item
            );
            this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
            this.cdr.detectChanges();
          });
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
        this.ngZone.run(() => {
          const wasUnread = !notification.read;
          this.notificationsList = this.notificationsList.filter((item) => item.id !== notification.id);
          if (wasUnread) {
            this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
          }
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Action methods
  viewProject(project: Project, event?: Event): void {
    event?.stopPropagation();
    this.ngZone.run(() => {
      this.selectedProject = project;
      this.hostedLinkInput = project.submissionHostedLink || '';
      this.submissionMessage = this.canEditHostedLink(project)
        ? ''
        : 'Hosted link can be saved only after proposal is accepted.';
      if (project.status === 'In Progress' && project.resubmissionReason) {
        this.submissionMessage = `Client requested changes: ${project.resubmissionReason}`;
      }
      this.showProjectDetails = true;
      this.cdr.detectChanges();
    });
  }

  closeProjectDetails(): void {
    this.ngZone.run(() => {
      this.showProjectDetails = false;
      this.selectedProject = null;
      this.hostedLinkInput = '';
      this.submissionMessage = '';
      this.cdr.detectChanges();
    });
  }

  saveHostedLink(event?: Event, directInputValue?: string): void {
    event?.stopPropagation();
    if (this.savingLink) {
      return;
    }

    if (!this.selectedProject) {
      return;
    }

    if (!this.canEditHostedLink(this.selectedProject)) {
      this.submissionMessage = 'Hosted link can be saved only after proposal is accepted.';
      return;
    }

    this.submissionMessage = '';
    let link = (directInputValue ?? this.hostedLinkInput).trim();
    if (!link) {
      this.submissionMessage = 'Please enter hosted link.';
      return;
    }

    if (!/^https?:\/\//i.test(link)) {
      link = `https://${link}`;
    }
    this.hostedLinkInput = link;

    // Immediate feedback on first click.
    this.submissionMessage = 'Hosted link saved successfully.';
    this.savingLink = true;
    const selectedId = this.selectedProject._id;
    // Optimistic update so first click reflects immediately.
    this.projects = this.projects.map((p) =>
      p._id === selectedId ? { ...p, submissionHostedLink: link } : p
    );
    this.selectedProject = this.projects.find((p) => p._id === selectedId) || this.selectedProject;

    this.projectService.uploadProjectSubmission(selectedId, { hostedLink: link }).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          const updatedProject = response.project as BackendProject | undefined;
          if (updatedProject) {
            this.patchProject(updatedProject);
            const refreshed = this.projects.find((p) => p._id === selectedId) || null;
            this.selectedProject = refreshed;
            this.hostedLinkInput = refreshed?.submissionHostedLink || link;
          }
          this.submissionMessage = 'Hosted link saved successfully.';
          this.savingLink = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Error saving hosted link:', error);
        this.ngZone.run(() => {
          this.submissionMessage = String(error?.message || '').includes('403')
            ? 'This project is not assigned to your account yet.'
            : 'Failed to save hosted link.';
          this.savingLink = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  canEditHostedLink(project: Project | null): boolean {
    return !!project && (project.status === 'In Progress' || project.status === 'Submitted');
  }

  openHostedLink(link?: string, event?: Event): void {
    event?.stopPropagation();
    const url = (link || '').trim();
    if (!url) {
      alert('Hosted link not uploaded yet.');
      return;
    }
    window.open(url, '_blank');
  }

  private patchProject(updated: BackendProject): void {
    this.projects = this.projects.map((p) =>
      p._id === updated._id
        ? {
            ...p,
            description: updated.description || p.description,
            submissionCodeFileName: updated.submissionCodeFileName || '',
            submissionCodeFilePath: updated.submissionCodeFilePath || '',
            submissionHostedLink: updated.submissionHostedLink || '',
            status: updated.status as Project['status'],
            resubmissionReason: updated.resubmissionReason || '',
            resubmissionRequestedAt: updated.resubmissionRequestedAt || null
          }
        : p
    );
  }

  submitWork(project: Project, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();

    const currentProject = this.projects.find((p) => p._id === project._id) || project;
    if (this.submittingProjectId === currentProject._id) {
      return;
    }

    if (!this.canSubmitWork(currentProject)) {
      if (this.isPaymentUnderReview(currentProject)) {
        alert('Payment is already completed/reviewed for this project.');
      } else if (currentProject.status === 'Submitted') {
        alert('Project already submitted.');
      } else if (currentProject.status !== 'In Progress') {
        alert('Submission is allowed only for active in-progress projects.');
      }
      return;
    }

    if (!currentProject.submissionHostedLink?.trim()) {
      alert('Please upload hosted link first.');
      return;
    }

    this.submittingProjectId = currentProject._id;
    const previousStatus = currentProject.status;

    // Optimistic UI update so action reflects on first click.
    this.projects = this.projects.map((p) =>
      p._id === currentProject._id ? { ...p, status: 'Submitted' } : p
    );
    if (this.selectedProject?._id === currentProject._id) {
      this.selectedProject = { ...this.selectedProject, status: 'Submitted' };
    }

    this.projectService.submitProjectWork(currentProject._id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.submittingProjectId = null;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Error submitting project work:', error);
        // Roll back if backend rejects submit.
        this.ngZone.run(() => {
          this.projects = this.projects.map((p) =>
            p._id === currentProject._id ? { ...p, status: previousStatus } : p
          );
          if (this.selectedProject?._id === currentProject._id) {
            this.selectedProject = { ...this.selectedProject, status: previousStatus };
          }
          this.submittingProjectId = null;
          this.cdr.detectChanges();
        });
        alert(error?.error?.message || 'Failed to submit work.');
      }
    });
  }

  isSubmittingProject(projectId: string): boolean {
    return this.submittingProjectId === projectId;
  }

  canSubmitWork(project: Project | null): boolean {
    // Show submit option for in-progress projects only, and hide once payment is completed/review state.
    return !!project && project.status === 'In Progress' && !this.isPaymentUnderReview(project);
  }

  isPaymentUnderReview(project: Project): boolean {
    return this.paidProjectIds.has(project._id);
  }

  messageClient(project: Project, event?: Event): void {
    event?.stopPropagation();
    const clientId = (project.clientId || '').trim();
    if (!clientId) {
      alert('Client information is missing for this project.');
      return;
    }

    this.router.navigate(['/freelancer-messages'], {
      queryParams: {
        partnerId: clientId,
        partnerName: project.clientName || 'Client',
        projectId: project._id
      }
    });
  }

  // Navigation methods
  goToDashboard(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-dashboard']);
  }

  goToFindJobs(): void {
    this.closeSidebar();
    this.router.navigate(['/find-jobs']);
  }

  goToMyGigs(): void {
    this.closeSidebar();
    this.router.navigate(['/my-gigs']);
  }

  goToMessages(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-messages']);
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

  goToEarnings(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-earnings']);
  }

  private loadNotifications(): void {
    this.notificationService.getMyNotifications(20, 1).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.notificationsList = (res?.notifications || []).map((item: BackendNotification) => ({
            id: String(item.id),
            type: item.type,
            message: item.message || item.title || 'New update',
            time: this.toRelativeTime(item.createdAt),
            read: !!item.isRead,
            actionUrl: item.actionUrl || ''
          }));
          this.unreadBellCount = Number(res?.unreadCount || 0);
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.unreadBellCount = Number(res?.unreadCount || 0);
          this.cdr.detectChanges();
        });
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

