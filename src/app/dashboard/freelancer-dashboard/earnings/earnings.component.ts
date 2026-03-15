import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { ProjectService } from '../../../services/project.service';
import type { Payment } from '../../../models/payment.model';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

interface EarningsSummary {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

interface MonthlyEarnings {
  month: string;
  amount: number;
}

interface PaymentRecord {
  projectName: string;
  clientName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Processing' | 'Failed';
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
  selector: 'app-earnings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './earnings.component.html',
  styleUrls: ['./earnings.component.css']
})
export class EarningsComponent implements OnInit {
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

  // Summary cards start at 0 until real payment data arrives.
  earningsSummary: EarningsSummary[] = this.buildZeroSummary();

  // Monthly earnings start at 0 and update from completed payments.
  monthlyEarnings: MonthlyEarnings[] = this.buildZeroMonthlyEarnings();

  maxEarnings = 1;

  // Payment history starts empty and is filled from backend.
  paymentHistory: PaymentRecord[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private projectService: ProjectService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.updateViewportState();
    const rawToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    // Load user data
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
    }

    const resolvedPayments = (this.route.snapshot.data['earningsPayments'] || []) as Payment[];
    this.applyPaymentData(resolvedPayments);
    this.loadNotifications();
    this.loadUnreadCount();

    // Background refresh to ensure latest user + latest payment records.
    this.syncCurrentUserAndRefreshPayments();
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

  getBarHeight(amount: number): number {
    if (!this.maxEarnings) {
      return 0;
    }
    return (amount / this.maxEarnings) * 100;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'Paid': 'fas fa-check-circle',
      'Pending': 'fas fa-clock',
      'Processing': 'fas fa-spinner',
      'Failed': 'fas fa-times-circle'
    };
    return icons[status] || 'fas fa-circle';
  }

  private loadEarningsFromPayments(): void {
    const freelancerId = this.userData?.id || this.userData?._id;
    if (!freelancerId) {
      this.resetEarningsToZero();
      return;
    }

    this.paymentService.getPayments(freelancerId, 'freelancer').subscribe({
      next: (response) => {
        const payments = (response?.payments || []) as Payment[];
        this.applyPaymentData(payments);
      },
      error: () => {
        this.resetEarningsToZero();
      }
    });
  }

  private syncCurrentUserAndRefreshPayments(): void {
    this.projectService.getCurrentUser().subscribe({
      next: (response: any) => {
        const currentUser = response?.user;
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'freelancer') {
          return;
        }
        this.userData = currentUser;
        sessionStorage.setItem('userData', JSON.stringify(currentUser));
        localStorage.setItem('userData', JSON.stringify(currentUser));
        this.loadEarningsFromPayments();
      },
      error: () => {
        // Keep resolver data as fallback.
      }
    });
  }

  private applyPaymentData(payments: Payment[]): void {
    const completed = payments.filter((p: any) => p.status === 'Completed');
    const pending = payments.filter((p: any) => p.status === 'Pending');

    // Show gross completed amount from DB as earnings (no platform-fee subtraction in UI).
    const totalEarningsValue = completed.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    const thisMonthEarningsValue = completed.reduce((sum: number, p: any) => {
      const paymentDate = new Date(p.paymentDate || p.createdAt || p.date || Date.now());
      const now = new Date();
      const sameMonth = paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
      if (!sameMonth) {
        return sum;
      }
      return sum + Number(p.amount || 0);
    }, 0);

    const pendingAmountValue = pending.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    this.earningsSummary = [
      { title: 'Total Earnings', value: `₹${totalEarningsValue.toLocaleString('en-IN')}`, icon: 'fas fa-wallet', color: 'green' },
      { title: 'This Month', value: `₹${thisMonthEarningsValue.toLocaleString('en-IN')}`, icon: 'fas fa-calendar-alt', color: 'blue' },
      { title: 'Pending Payments', value: `₹${pendingAmountValue.toLocaleString('en-IN')}`, icon: 'fas fa-clock', color: 'orange' },
      { title: 'Completed Projects', value: completed.length, icon: 'fas fa-check-circle', color: 'purple' }
    ];

    this.monthlyEarnings = this.buildMonthlyEarningsFromPayments(completed);
    this.maxEarnings = Math.max(1, ...this.monthlyEarnings.map((m) => m.amount));

    const sortedPayments = [...payments].sort((a: any, b: any) => {
      const bDate = new Date(b.paymentDate || b.createdAt || b.date || 0).getTime();
      const aDate = new Date(a.paymentDate || a.createdAt || a.date || 0).getTime();
      return bDate - aDate;
    });

    this.paymentHistory = sortedPayments
      .map((p: any) => ({
        projectName: p.projectTitle || p.projectName || 'Project',
        clientName: p.clientName || p.clientId?.fullName || 'Client',
        amount: Number(p.amount || 0),
        date: this.formatPaymentDate(p.paymentDate || p.createdAt || p.date),
        status: this.mapPaymentStatus(p.status)
      }));
  }

  private mapPaymentStatus(status: string): PaymentRecord['status'] {
    if (status === 'Completed') {
      return 'Paid';
    }
    if (status === 'Pending') {
      return 'Pending';
    }
    if (status === 'Failed') {
      return 'Failed';
    }
    return 'Processing';
  }

  private formatPaymentDate(value: string | Date | undefined): string {
    const date = value ? new Date(value) : new Date();
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private buildMonthlyEarningsFromPayments(completedPayments: Payment[]): MonthlyEarnings[] {
    const now = new Date();
    const buckets: MonthlyEarnings[] = [];

    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        amount: 0
      });
    }

    completedPayments.forEach((payment: any) => {
      const date = new Date(payment.paymentDate || payment.createdAt || payment.date || Date.now());
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      const idx = buckets.findIndex((b) => b.month === monthKey);
      if (idx !== -1) {
        buckets[idx].amount += Number(payment.amount || 0);
      }
    });

    return buckets;
  }

  private buildZeroSummary(): EarningsSummary[] {
    return [
      { title: 'Total Earnings', value: '₹0', icon: 'fas fa-wallet', color: 'green' },
      { title: 'This Month', value: '₹0', icon: 'fas fa-calendar-alt', color: 'blue' },
      { title: 'Pending Payments', value: '₹0', icon: 'fas fa-clock', color: 'orange' },
      { title: 'Completed Projects', value: 0, icon: 'fas fa-check-circle', color: 'purple' }
    ];
  }

  private buildZeroMonthlyEarnings(): MonthlyEarnings[] {
    const now = new Date();
    const months: MonthlyEarnings[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        amount: 0
      });
    }
    return months;
  }

  private resetEarningsToZero(): void {
    this.earningsSummary = this.buildZeroSummary();
    this.monthlyEarnings = this.buildZeroMonthlyEarnings();
    this.maxEarnings = 1;
    this.paymentHistory = [];
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

  goToProjects(): void {
    this.closeSidebar();
    this.router.navigate(['/my-projects']);
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

