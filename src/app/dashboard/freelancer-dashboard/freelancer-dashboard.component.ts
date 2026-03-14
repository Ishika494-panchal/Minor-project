import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BackendProject, ProjectService } from '../../services/project.service';

interface Project {
  id: string;
  name: string;
  client: string;
  budget: number;
  deadline: string;
  status: string;
}

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-freelancer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './freelancer-dashboard.component.html',
  styleUrls: ['./freelancer-dashboard.component.css']
})
export class FreelancerDashboardComponent implements OnInit {
  userData: any = null;
  
  // Navbar
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  notificationsCount = 3;
  
  // Mock data for stats
  stats = {
    totalEarnings: 125000,
    activeProjects: 0,
    pendingProposals: 7,
    completedJobs: 23
  };
  
  // Active projects shown in dashboard card
  activeProjects: Project[] = [];
  
  // Notifications
  notificationsList: NotificationItem[] = [
    {
      id: 1,
      type: 'job',
      message: 'New job matching your skills: React Developer',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      type: 'message',
      message: 'You have a new message from Tech Solutions Inc.',
      time: '5 hours ago',
      read: false
    },
    {
      id: 3,
      type: 'payment',
      message: 'Payment received: ₹15,000',
      time: '1 day ago',
      read: true
    }
  ];

  constructor(
    private router: Router,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    const rawToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
    }

    this.loadCurrentUserAndActiveProjects();
  }

  private loadCurrentUserAndActiveProjects(): void {
    this.projectService.getCurrentUser().subscribe({
      next: (response: any) => {
        const currentUser = response?.user;
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'freelancer') {
          this.activeProjects = [];
          this.stats.activeProjects = 0;
          this.cdr.detectChanges();
          return;
        }

        this.userData = currentUser;
        sessionStorage.setItem('userData', JSON.stringify(currentUser));
        localStorage.setItem('userData', JSON.stringify(currentUser));
        this.loadActiveWorkingProjects(currentUser.id || currentUser._id);
        this.cdr.detectChanges();
      },
      error: () => {
        const fallbackFreelancerId = this.userData?.id || this.userData?._id;
        if (fallbackFreelancerId) {
          this.loadActiveWorkingProjects(fallbackFreelancerId);
          return;
        }

        this.activeProjects = [];
        this.stats.activeProjects = 0;
        this.cdr.detectChanges();
      }
    });
  }

  private loadActiveWorkingProjects(freelancerId?: string): void {
    if (!freelancerId) {
      this.activeProjects = [];
      this.stats.activeProjects = 0;
      this.cdr.detectChanges();
      return;
    }

    this.projectService.getFreelancerProjects(freelancerId).subscribe({
      next: (projects: BackendProject[]) => {
        this.activeProjects = (projects || [])
          .filter((project) => this.isWorkingProject(project.status))
          .map((project) => ({
            id: project._id,
            name: project.title,
            client: project.clientName || 'Client',
            budget: project.budget,
            deadline: project.deadline,
            status: project.status
          }));

        this.stats.activeProjects = this.activeProjects.length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.activeProjects = [];
        this.stats.activeProjects = 0;
        this.cdr.detectChanges();
      }
    });
  }

  private isWorkingProject(status: string): boolean {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'in progress' || normalized === 'working';
  }

goToNotifications(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/freelancer-messages']);
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

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.showProfileMenu = false;
    this.router.navigate(['/freelancer-profile']);
  }

  goToSettings(): void {
    this.showProfileMenu = false;
    this.router.navigate(['/freelancer-settings']);
  }

  goToFindJobs(): void {
    this.router.navigate(['/find-jobs']);
  }

  goToMyGigs(): void {
    this.router.navigate(['/my-gigs']);
  }

  goToProjects(): void {
    this.router.navigate(['/my-projects']);
  }

  goToMessages(): void {
    this.router.navigate(['/freelancer-messages']);
  }

  goToEarnings(): void {
    this.router.navigate(['/freelancer-earnings']);
  }
}

