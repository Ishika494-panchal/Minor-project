import { ChangeDetectorRef, Component, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../../services/message.service';
import { NotificationItem as BackendNotification, NotificationService } from '../../services/notification.service';

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.css', './client-responsive-shared.css']
})
export class ClientDashboardComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  userData: any = null;
  isSidebarOpen = false;
  stats = {
    activeProjects: 0,
    completedProjects: 0,
    totalSpent: 0,
    activeFreelancers: 0
  };
  recentProjects: any[] = [];

  // Notification dropdown
  showNotifications = false;
  notificationsList: NotificationItem[] = [];
  unreadBellCount = 0;

  // Profile dropdown
  showProfileMenu = false;

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private messageService: MessageService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      const token = this.getAuthToken();
      if (token) {
        this.messageService.connect(token);
      }
      this.bindRealtimeNotifications();
      this.loadNotifications();
      this.loadUnreadCount();
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  // Navigate to post project
  goToPostProject(): void {
    this.router.navigate(['/post-project']);
  }

  // Toggle notification dropdown
  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  // Toggle profile dropdown
  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper') && !target.closest('.profile-wrapper')) {
      this.showNotifications = false;
      this.showProfileMenu = false;
    }
  }

  // Get notification icon based on type
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

  // Get unread notification count
  get unreadCount(): number {
    return this.unreadBellCount;
  }

  // Mark all notifications as read
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

  openMessagesFromNotification(event?: Event): void {
    event?.preventDefault();
    this.showNotifications = false;
    this.router.navigate(['/client-messages']);
  }

  // Navigate to profile
  goToProfile(): void {
    this.router.navigate(['/client-profile']);
    this.showProfileMenu = false;
  }

  // Navigate to settings
  goToSettings(): void {
    this.router.navigate(['/client-settings']);
    this.showProfileMenu = false;
  }

  toggleSidebar(event?: Event): void {
    event?.stopPropagation();
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  private bindRealtimeNotifications(): void {
    this.subscriptions.add(
      this.messageService.socketNotification$.subscribe((notification) => {
        if (!notification) return;
        this.ngZone.run(() => {
          const mapped = this.mapNotification(notification);
          this.notificationsList = [mapped, ...this.notificationsList];
          this.unreadBellCount += mapped.read ? 0 : 1;
          this.cdr.detectChanges();
        });
      })
    );

    this.subscriptions.add(
      this.messageService.socketNotificationCount$.subscribe((count) => {
        if (count === null || typeof count !== 'number') return;
        this.ngZone.run(() => {
          this.unreadBellCount = Math.max(0, count);
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

