import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService, BackendProject, BackendProposal } from '../../../services/project.service';
import { FreelancerProjectsResolvedData } from '../../../resolvers/freelancer-projects.resolver';

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
}

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  time: string;
  read: boolean;
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
  
  // Notifications
  notificationsList: NotificationItem[] = [
    {
      id: 1,
      type: 'project',
      message: 'New project assigned: Portfolio Website',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      type: 'message',
      message: 'You have a new message from Priya Patel',
      time: '5 hours ago',
      read: false
    },
    {
      id: 3,
      type: 'payment',
      message: 'Payment received: ₹2,500',
      time: '1 day ago',
      read: true
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      const resolvedData = (this.route.snapshot.data['projects'] || { projects: [], proposals: [] }) as FreelancerProjectsResolvedData;
      const assignedProjects = this.mapProjects(resolvedData.projects || []);
      const appliedProjects = this.mapAppliedProjects(resolvedData.proposals || [], assignedProjects);
      this.projects = [...assignedProjects, ...appliedProjects];
      this.isLoading = false;
    } else {
      this.router.navigate(['/login']);
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
        this.projects = this.mapProjects(projects);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading freelancer projects:', error);
        this.projects = [];
        this.isLoading = false;
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
      submissionHostedLink: project.submissionHostedLink || ''
    }));
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

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
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
  }

  search(): void {
    console.log('Searching:', this.searchQuery);
  }

  getStatusClass(status: string): string {
    if (status === 'Applied') {
      return 'pending';
    }
    return status.toLowerCase().replace(' ', '-');
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      job: 'fas fa-briefcase',
      payment: 'fas fa-dollar-sign',
      message: 'fas fa-envelope',
      project: 'fas fa-folder-open',
      review: 'fas fa-star'
    };
    return icons[type] || 'fas fa-bell';
  }

  get unreadCount(): number {
    return this.notificationsList.filter(n => !n.read).length;
  }

  markAllAsRead(): void {
    this.notificationsList.forEach(n => n.read = true);
  }

  // Action methods
  viewProject(project: Project, event?: Event): void {
    event?.stopPropagation();
    this.selectedProject = project;
    this.hostedLinkInput = project.submissionHostedLink || '';
    this.submissionMessage = this.canEditHostedLink(project)
      ? ''
      : 'Hosted link can be saved only after proposal is accepted.';
    this.showProjectDetails = true;
  }

  closeProjectDetails(): void {
    this.showProjectDetails = false;
    this.selectedProject = null;
    this.hostedLinkInput = '';
    this.submissionMessage = '';
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
        const updatedProject = response.project as BackendProject | undefined;
        if (updatedProject) {
          this.patchProject(updatedProject);
          const refreshed = this.projects.find((p) => p._id === selectedId) || null;
          this.selectedProject = refreshed;
          this.hostedLinkInput = refreshed?.submissionHostedLink || link;
        }
        this.submissionMessage = 'Hosted link saved successfully.';
        this.savingLink = false;
      },
      error: (error) => {
        console.error('Error saving hosted link:', error);
        this.submissionMessage = String(error?.message || '').includes('403')
          ? 'This project is not assigned to your account yet.'
          : 'Failed to save hosted link.';
        this.savingLink = false;
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
            status: updated.status as Project['status']
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

    if (currentProject.status !== 'In Progress') {
      if (currentProject.status === 'Submitted') {
        alert('Project already submitted.');
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
        this.submittingProjectId = null;
      },
      error: (error) => {
        console.error('Error submitting project work:', error);
        // Roll back if backend rejects submit.
        this.projects = this.projects.map((p) =>
          p._id === currentProject._id ? { ...p, status: previousStatus } : p
        );
        if (this.selectedProject?._id === currentProject._id) {
          this.selectedProject = { ...this.selectedProject, status: previousStatus };
        }
        this.submittingProjectId = null;
        alert(error?.error?.message || 'Failed to submit work.');
      }
    });
  }

  isSubmittingProject(projectId: string): boolean {
    return this.submittingProjectId === projectId;
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
        partnerName: project.clientName || 'Client'
      }
    });
  }

  // Navigation methods
  goToDashboard(): void {
    this.router.navigate(['/freelancer-dashboard']);
  }

  goToFindJobs(): void {
    this.router.navigate(['/find-jobs']);
  }

  goToMyGigs(): void {
    this.router.navigate(['/my-gigs']);
  }

  goToMessages(): void {
    this.router.navigate(['/freelancer-messages']);
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.showProfileMenu = false;
  }

  goToSettings(): void {
    this.showProfileMenu = false;
  }

  goToEarnings(): void {
    this.router.navigate(['/freelancer-earnings']);
  }
}

