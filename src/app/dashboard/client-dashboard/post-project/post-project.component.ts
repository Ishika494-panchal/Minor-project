import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectService, BackendProject, ApiResponse } from '../../../services/project.service';
import { PROJECT_CATEGORIES, COMMON_SKILLS } from '../../../services/mock-data.service';
import { Project } from '../../../services/mock-data.service';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-post-project',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './post-project.component.html',
  styleUrls: ['./post-project.component.css', '../client-responsive-shared.css']
})
export class PostProjectComponent implements OnInit {
  // Form data
  project: Omit<Project, 'id' | 'createdAt'> = {
    title: '',
    description: '',
    category: '',
    skills: [],
    budget: 0,
    deadline: '',
    experienceLevel: 'Intermediate',
    projectType: 'Fixed Price',
    attachments: [],
    allowProposals: true,
    clientId: '',
    clientName: '',
    status: 'Open'
  };
  
  // Options
  categories = PROJECT_CATEGORIES;
  skills = COMMON_SKILLS;
  experienceLevels = ['Beginner', 'Intermediate', 'Expert'];
  projectTypes = ['Fixed Price', 'Hourly'];
  
  // UI state
  isSidebarOpen = false;
  selectedSkills: string[] = [];
  skillSearch = '';
  showSkillDropdown = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  userData: any = null;
  
  // File upload
  selectedFiles: File[] = [];

  // Dropdowns
  showNotifications = false;
  notificationsList: any[] = [];
  unreadBellCount = 0;
  showProfileMenu = false;
  
  constructor(
    private router: Router,
    private projectService: ProjectService,
    private notificationService: NotificationService
  ) {}
  
  ngOnInit(): void {
    const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.project.clientId = this.userData.id || this.userData._id || '';
      this.project.clientName = this.userData.fullName || this.userData.email?.split('@')[0] || 'Client';
      // Prefill with sample data for testing
      this.project.title = 'Sample E-commerce Website Development';
      this.project.description = 'Looking for an experienced developer to build a full-featured e-commerce website with payment integration (Stripe/Razorpay), admin panel, user authentication, responsive design, and product management system. Must have experience with MERN stack.';
      this.project.category = 'Web Development';
      this.selectedSkills = ['React', 'Node.js', 'MongoDB', 'Stripe', 'Responsive Design'];
      this.project.budget = 50000;
      this.project.deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now
      this.project.experienceLevel = 'Expert';
      this.loadNotifications();
      this.loadUnreadCount();
    } else {
      this.router.navigate(['/login']);
    }
  }
  
  // Filter skills based on search
  get filteredSkills(): string[] {
    if (!this.skillSearch) {
      return this.skills.filter(s => !this.selectedSkills.includes(s)).slice(0, 10);
    }
    return this.skills
      .filter(s => s.toLowerCase().includes(this.skillSearch.toLowerCase()) && !this.selectedSkills.includes(s))
      .slice(0, 10);
  }
  
  addSkill(skill: string): void {
    if (!this.selectedSkills.includes(skill)) {
      this.selectedSkills.push(skill);
    }
    this.skillSearch = '';
    this.showSkillDropdown = false;
  }
  
  removeSkill(skill: string): void {
    this.selectedSkills = this.selectedSkills.filter(s => s !== skill);
  }
  
  onSkillKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.skillSearch.trim()) {
      event.preventDefault();
      const skill = this.skillSearch.trim();
      if (!this.selectedSkills.includes(skill)) {
        this.addSkill(skill);
      }
    }
  }
  
  toggleSkillDropdown(): void {
    this.showSkillDropdown = !this.showSkillDropdown;
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.selectedFiles = [...this.selectedFiles, ...files];
    }
    input.value = '';
  }
  
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }
  
  getFileName(path: string): string {
    return path.split(/[\\\\/]/).pop() || path;
  }
  
  validateForm(): boolean {
    if (!this.project.title.trim()) {
      this.errorMessage = 'Please enter a project title';
      return false;
    }
    if (!this.project.description.trim()) {
      this.errorMessage = 'Please enter a project description';
      return false;
    }
    if (!this.project.category) {
      this.errorMessage = 'Please select a category';
      return false;
    }
    if (this.selectedSkills.length === 0) {
      this.errorMessage = 'Please add at least one required skill';
      return false;
    }
    if (!this.project.budget || this.project.budget <= 0) {
      this.errorMessage = 'Please enter a valid budget';
      return false;
    }
    if (!this.project.deadline) {
      this.errorMessage = 'Please select a deadline';
      return false;
    }
    
    const deadlineDate = new Date(this.project.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deadlineDate <= today) {
      this.errorMessage = 'Deadline must be in the future';
      return false;
    }
    
    return true;
  }
  
  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    
    if (!this.validateForm()) {
      return;
    }
    
    this.isSubmitting = true;
    
    // Prepare data for backend (update skills & attachments)
    const projectData = {
      ...this.project,
      skills: [...this.selectedSkills],
      attachments: this.selectedFiles.map(f => f.name)
    };
    
    this.projectService.createProject(projectData).subscribe({
      next: (response: ApiResponse<BackendProject>) => {
        if (response.success) {
          this.successMessage = 'Project posted successfully! Redirecting to your projects...';
          // Reset form
          this.project = {
            title: '',
            description: '',
            category: '',
            skills: [],
            budget: 0,
            deadline: '',
            experienceLevel: 'Intermediate',
            projectType: 'Fixed Price',
            attachments: [],
            allowProposals: true,
            clientId: this.userData?.id || this.userData?._id || '',
            clientName: this.userData?.fullName || '',
            status: 'Open'
          };
          this.selectedSkills = [];
          this.selectedFiles = [];
          
          // Redirect
          setTimeout(() => {
            this.router.navigate(['/projects']);
          }, 2000);
        } else {
          this.errorMessage = response.message || 'Failed to create project';
        }
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to post project. Please try again.';
        console.error('Project creation error:', error);
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }
  
  onCancel(): void {
    this.router.navigate(['/client-dashboard']);
  }

  toggleSidebar(event?: Event): void {
    event?.stopPropagation();
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  // Dropdown methods
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
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notificationsList = this.notificationsList.map((n: any) => ({ ...n, read: true }));
        this.unreadBellCount = 0;
      }
    });
  }

  onNotificationClick(notification: any, event?: Event): void {
    event?.stopPropagation();
    if (!notification?.read && notification?.id) {
      this.notificationService.markAsRead(String(notification.id)).subscribe({
        next: () => {
          this.notificationsList = this.notificationsList.map((item: any) =>
            String(item.id) === String(notification.id) ? { ...item, read: true } : item
          );
          this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
        }
      });
    }

    const actionUrl = String(notification?.actionUrl || '').trim();
    if (actionUrl) {
      this.showNotifications = false;
      this.router.navigateByUrl(actionUrl);
    }
  }

  deleteNotification(notification: any, event?: Event): void {
    event?.stopPropagation();
    const id = String(notification?.id || '').trim();
    if (!id) return;
    this.notificationService.archiveNotification(id).subscribe({
      next: () => {
        const wasUnread = !notification?.read;
        this.notificationsList = this.notificationsList.filter((item: any) => String(item.id) !== id);
        if (wasUnread) {
          this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
        }
      }
    });
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

  goToProfile(): void {
    this.router.navigate(['/client-profile']);
    this.showProfileMenu = false;
  }

  goToSettings(): void {
    this.router.navigate(['/client-settings']);
    this.showProfileMenu = false;
  }
  
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
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

