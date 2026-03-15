import { Component, OnInit, HostListener, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BackendProject, BackendProposal, ProjectService } from '../../services/project.service';
import { NotificationItem as BackendNotification, NotificationService } from '../../services/notification.service';
import { MessageService } from '../../services/message.service';
import { PaymentService } from '../../services/payment.service';
import { Subscription } from 'rxjs';

interface Project {
  id: string;
  name: string;
  client: string;
  budget: number;
  deadline: string;
  status: string;
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
  selector: 'app-freelancer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './freelancer-dashboard.component.html',
  styleUrls: ['./freelancer-dashboard.component.css']
})
export class FreelancerDashboardComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  userData: any = null;
  isMobileOrTablet = false;
  isSidebarOpen = false;
  
  // Navbar
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  notificationsCount = 0;
  
  // Dashboard stats
  stats = {
    totalEarnings: 0,
    activeProjects: 0,
    pendingProposals: 0,
    completedJobs: 0
  };
  
  // Active projects shown in dashboard card
  activeProjects: Project[] = [];
  
  // Notifications
  notificationsList: NotificationItem[] = [];

  constructor(
    private router: Router,
    private projectService: ProjectService,
    private paymentService: PaymentService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private messageService: MessageService,
    private ngZone: NgZone
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

    this.updateViewportState();
    this.loadCurrentUserAndActiveProjects();
    this.bindRealtimeNotifications();
    this.loadNotifications();
    this.loadUnreadCount();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
        const freelancerId = currentUser.id || currentUser._id;
        this.loadActiveWorkingProjects(freelancerId);
        this.loadFreelancerStats(freelancerId);
        this.cdr.detectChanges();
      },
      error: () => {
        const fallbackFreelancerId = this.userData?.id || this.userData?._id;
        if (fallbackFreelancerId) {
          this.loadActiveWorkingProjects(fallbackFreelancerId);
          this.loadFreelancerStats(fallbackFreelancerId);
          return;
        }

        this.activeProjects = [];
        this.stats.activeProjects = 0;
        this.stats.pendingProposals = 0;
        this.stats.completedJobs = 0;
        this.stats.totalEarnings = 0;
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

  private loadFreelancerStats(freelancerId: string): void {
    this.paymentService.getMyCompletedJobsCount().subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.stats.completedJobs = Number(response?.completedJobsCount || 0);
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.stats.completedJobs = 0;
          this.cdr.detectChanges();
        });
      }
    });

    this.projectService.getFreelancerProposals(freelancerId).subscribe({
      next: (proposals: BackendProposal[]) => {
        const pendingProposalsCount = (proposals || []).filter(
          (proposal) => String(proposal.status || '').toLowerCase() === 'pending'
        ).length;

        this.ngZone.run(() => {
          this.stats.pendingProposals = pendingProposalsCount;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.stats.pendingProposals = 0;
          this.cdr.detectChanges();
        });
      }
    });

    this.paymentService.getPayments(freelancerId, 'freelancer').subscribe({
      next: (response) => {
        const completedPayments = (response?.payments || []).filter(
          (payment: any) => String(payment?.status || '').toLowerCase() === 'completed'
        );
        const totalEarnings = completedPayments.reduce((sum: number, payment: any) => sum + Number(payment?.amount || 0), 0);

        this.ngZone.run(() => {
          this.stats.totalEarnings = totalEarnings;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.stats.totalEarnings = 0;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private isWorkingProject(status: string): boolean {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'in progress' || normalized === 'working';
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
    console.log('Searching:', this.searchQuery);
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(' ', '-');
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
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
    return this.notificationsCount;
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.notificationsList = this.notificationsList.map((item) => ({ ...item, read: true }));
          this.notificationsCount = 0;
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
            this.notificationsCount = Math.max(0, this.notificationsCount - 1);
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
            this.notificationsCount = Math.max(0, this.notificationsCount - 1);
          }
          this.cdr.detectChanges();
        });
      }
    });
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
    this.closeSidebar();
    this.router.navigate(['/freelancer-profile']);
  }

  goToSettings(): void {
    this.showProfileMenu = false;
    this.closeSidebar();
    this.router.navigate(['/freelancer-settings']);
  }

  goToFindJobs(): void {
    this.closeSidebar();
    this.router.navigate(['/find-jobs']);
  }

  goToMyGigs(): void {
    this.closeSidebar();
    this.router.navigate(['/my-gigs']);
  }

  goToProjects(): void {
    this.closeSidebar();
    this.router.navigate(['/my-projects']);
  }

  goToMessages(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-messages']);
  }

  goToEarnings(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-earnings']);
  }

  openMessagesFromNotification(event?: Event): void {
    event?.preventDefault();
    this.showNotifications = false;
    this.router.navigate(['/freelancer-messages']);
  }

  private bindRealtimeNotifications(): void {
    const token = this.getAuthToken();
    if (token) {
      this.messageService.connect(token);
    }

    this.subscriptions.add(
      this.messageService.socketNotification$.subscribe((notification) => {
        if (!notification) return;
        this.ngZone.run(() => {
          const mapped = this.mapNotification(notification);
          this.notificationsList = [mapped, ...this.notificationsList];
          this.notificationsCount += mapped.read ? 0 : 1;
          this.cdr.detectChanges();
        });
      })
    );

    this.subscriptions.add(
      this.messageService.socketNotificationCount$.subscribe((count) => {
        if (count === null || typeof count !== 'number') return;
        this.ngZone.run(() => {
          this.notificationsCount = Math.max(0, count);
          this.cdr.detectChanges();
        });
      })
    );
  }

  private loadNotifications(): void {
    this.notificationService.getMyNotifications(20, 1).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.notificationsList = (res?.notifications || []).map((item: BackendNotification) =>
            this.mapNotification(item)
          );
          this.notificationsCount = Number(res?.unreadCount || 0);
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.notificationsCount = Number(res?.unreadCount || 0);
          this.cdr.detectChanges();
        });
      }
    });
  }

  private mapNotification(notification: BackendNotification): NotificationItem {
    return {
      id: String(notification.id),
      type: notification.type,
      message: notification.message || notification.title || 'New update',
      time: this.toRelativeTime(notification.createdAt),
      read: !!notification.isRead,
      actionUrl: notification.actionUrl || ''
    };
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

  private getAuthToken(): string {
    const raw = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    return raw.replace(/^"(.*)"$/, '$1').trim();
  }
}

