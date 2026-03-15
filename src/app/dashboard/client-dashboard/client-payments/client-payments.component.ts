import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { finalize } from 'rxjs/operators';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

interface UiPayment {
  id: string;
  projectId?: string;
  projectTitle: string;
  freelancerName: string;
  amount: number;
  paymentMethod: string;
  date: Date;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
}

interface UiSummary {
  totalSpent: number;
  pendingPayments: number;
  completedPayments: number;
}

@Component({
  selector: 'app-client-payments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-payments.component.html',
  styleUrls: ['./client-payments.component.css', '../client-responsive-shared.css']
})
export class ClientPaymentsComponent implements OnInit {
  userData: any = null;
  isSidebarOpen = false;
  payments: UiPayment[] = [];
  summary: UiSummary = {
    totalSpent: 0,
    pendingPayments: 0,
    completedPayments: 0
  };
  processingPayment: string | null = null;
  isLoadingPayments = false;
  loadError = '';
  showNotifications = false;
  notificationsList: any[] = [];
  unreadBellCount = 0;

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
      this.loadPayments();
      this.loadNotifications();
      this.loadUnreadCount();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadPayments(): void {
    this.isLoadingPayments = true;
    this.loadError = '';

    // Backend scopes records to the logged-in user via JWT.
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
          const apiPayments = response?.payments || [];
          this.ngZone.run(() => {
            this.payments = apiPayments.map((payment: any) => ({
              id: String(payment._id || payment.id || ''),
              projectId: String(payment?.projectId?._id || payment?.projectId || ''),
              projectTitle: payment.projectTitle || payment?.projectId?.title || 'Project',
              freelancerName: payment.freelancerName || payment?.freelancerId?.fullName || 'Freelancer',
              amount: Number(payment.amount || 0),
              paymentMethod: payment.paymentMethod || 'Razorpay',
              date: new Date(payment.paymentDate || payment.createdAt || Date.now()),
              status: payment.status || 'Pending'
            }));

            this.summary = {
              totalSpent: this.payments
                .filter((p) => p.status === 'Completed')
                .reduce((sum, p) => sum + p.amount, 0),
              pendingPayments: this.payments.filter((p) => p.status === 'Pending').length,
              completedPayments: this.payments.filter((p) => p.status === 'Completed').length
            };
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.payments = [];
            this.summary = { totalSpent: 0, pendingPayments: 0, completedPayments: 0 };
            this.loadError = 'Unable to load payments right now.';
            this.cdr.detectChanges();
          });
        }
      });
  }

  payNow(payment: UiPayment): void {
    this.router.navigate(['/projects']);
  }

  toggleSidebar(event?: Event): void {
    event?.stopPropagation();
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper')) {
      this.showNotifications = false;
    }
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.notificationsList = this.notificationsList.map((item: any) => ({ ...item, read: true }));
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

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  getPendingPayments(): UiPayment[] {
    return this.payments.filter(p => p.status === 'Pending');
  }

  getCompletedPayments(): UiPayment[] {
    return this.payments.filter(p => p.status === 'Completed');
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

