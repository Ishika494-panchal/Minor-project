import { ChangeDetectorRef, Component, OnInit, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { finalize } from 'rxjs/operators';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

interface UiPayment {
  id: string;
  projectTitle: string;
  freelancerName: string;
  amount: number;
  paymentMethod: string;
  date: Date;
  status: 'Pending' | 'Reviewing' | 'Completed' | 'Failed' | 'Refunded';
}

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.css', '../client-responsive-shared.css']
})
export class PaymentHistoryComponent implements OnInit {
  userData: any = null;
  isSidebarOpen = false;
  payments: UiPayment[] = [];
  totalAmount: number = 0;
  isLoadingPayments = false;
  loadError = '';

  // Notification dropdown
  showNotifications = false;
  notificationsList: any[] = [];
  unreadBellCount = 0;

  // Profile dropdown
  showProfileMenu = false;

  constructor(
    private router: Router,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.loadPaymentHistory();
      this.loadNotifications();
      this.loadUnreadCount();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadPaymentHistory(): void {
    this.isLoadingPayments = true;
    this.loadError = '';

    // Backend now scopes to logged-in user via JWT.
    this.paymentService.getPayments(undefined, 'client')
      .pipe(
        finalize(() => {
          this.ngZone.run(() => {
            this.isLoadingPayments = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response) => {
          const apiPayments = (response?.payments || [])
            .filter((payment: any) => String(payment?.status) === 'Completed');

          this.ngZone.run(() => {
            this.payments = apiPayments.map((payment: any) => ({
              id: String(payment._id || payment.id || ''),
              projectTitle: payment.projectTitle || payment?.projectId?.title || 'Project',
              freelancerName: payment.freelancerName || payment?.freelancerId?.fullName || 'Freelancer',
              amount: Number(payment.amount || 0),
              paymentMethod: payment.paymentMethod || 'Razorpay',
              date: new Date(payment.paymentDate || payment.createdAt || Date.now()),
              status: payment.status || 'Completed'
            }));

            this.totalAmount = this.payments.reduce((sum, p) => sum + p.amount, 0);
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.payments = [];
            this.totalAmount = 0;
            this.loadError = 'Unable to load payment history right now.';
            this.cdr.detectChanges();
          });
        }
      });
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

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.notificationsList = this.notificationsList.map((n: any) => ({ ...n, read: true }));
          this.unreadBellCount = 0;
          this.cdr.detectChanges();
        });
      }
    });
  }

  onNotificationClick(notification: any, event?: Event): void {
    event?.stopPropagation();
    if (!notification?.read && notification?.id) {
      this.notificationService.markAsRead(String(notification.id)).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.notificationsList = this.notificationsList.map((item: any) =>
              String(item.id) === String(notification.id) ? { ...item, read: true } : item
            );
            this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
            this.cdr.detectChanges();
          });
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
        this.ngZone.run(() => {
          const wasUnread = !notification?.read;
          this.notificationsList = this.notificationsList.filter((item: any) => String(item.id) !== id);
          if (wasUnread) {
            this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
          }
          this.cdr.detectChanges();
        });
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

